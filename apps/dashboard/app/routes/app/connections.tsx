import { getAuth } from '@clerk/react-router/server';
import { data, redirect } from 'react-router';

import { ConnectionsWorkspace } from '../../components/features/connections/connections-workspace';
import {
  clearConnectionError,
  deleteConnectionRecord,
  disconnectAccount,
  updateConnectionPreferences,
} from '../../features/connections/actions.server';
import { listConnectedAccounts } from '../../features/connections/queries.server';
import { refreshHandleCoverage } from '../../features/connections/handle-coverage.server';
import { readHandleCoverage } from '../../features/connections/handle-queries.server';
import {
  githubIsConfigured,
  revokeGitHubConnection,
  syncGitHubProfile,
} from '../../features/connections/github.server';
import {
  revokeTwitchConnection,
  syncTwitchProfile,
  twitchIsConfigured,
} from '../../features/connections/twitch.server';
import { connectionPreferencesSchema } from '../../features/connections/schema';
import { createProfileLink } from '../../features/links/actions.server';
import { getLinkPlatform, normalizeProvider, platformUrl } from '../../features/links/platforms';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/connections';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Connections — Ownlane' }];
}

async function resolveContext(args: Route.LoaderArgs | Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('This workspace has no profile.', { status: 404 });
  return { env, profile };
}

export async function loader(args: Route.LoaderArgs) {
  const { env, profile } = await resolveContext(args);
  const { ctx } = args.context.get(cloudflare);

  // Tops up after the response. Handle coverage changes over weeks, so this
  // costs almost nothing and nobody is asked to press a button for it.
  ctx.waitUntil(refreshHandleCoverage(env, profile.id).catch(() => undefined));

  return {
    handles: await readHandleCoverage(env.DB, profile.id),
    accounts: await listConnectedAccounts(env.DB, profile.id),
    enabledProviders: [
      githubIsConfigured(env) ? 'github' : null,
      twitchIsConfigured(env) ? 'twitch' : null,
    ].filter((provider): provider is string => Boolean(provider)),
  };
}

export async function action(args: Route.ActionArgs) {
  const { env, profile } = await resolveContext(args);
  const form = await args.request.formData();
  const intent = String(form.get('intent') ?? '');
  const accountId = String(form.get('accountId') ?? '');
  if (!accountId) return data({ error: 'Choose a connection first.' }, { status: 400 });

  if (intent === 'save-preferences') {
    const parsed = connectionPreferencesSchema.safeParse({
      syncMode: form.get('syncMode'),
      approvalRequired: form.get('approvalRequired') === 'on',
      fields: form.getAll('fields').map(String),
    });
    if (!parsed.success)
      return data({ error: 'Those synchronization preferences are not valid.' }, { status: 400 });
    const saved = await updateConnectionPreferences(env.DB, profile.id, accountId, parsed.data);
    return saved
      ? { message: 'Connection preferences saved' }
      : data({ error: 'That active connection no longer exists.' }, { status: 404 });
  }

  if (intent === 'disconnect') {
    const provider = await env.DB.prepare(
      'SELECT provider FROM connected_accounts WHERE id=?1 AND profile_id=?2',
    )
      .bind(accountId, profile.id)
      .first<{ provider: string }>();
    const revoked =
      provider?.provider === 'twitch'
        ? await revokeTwitchConnection(env, profile.id, accountId)
        : await revokeGitHubConnection(env, profile.id, accountId);
    if (!revoked) {
      return data(
        { error: 'GitHub could not be disconnected. Please try again.' },
        { status: 502 },
      );
    }
    const disconnected = await disconnectAccount(env.DB, profile.id, accountId);
    return disconnected
      ? { message: 'Account disconnected' }
      : data({ error: 'That connection no longer exists.' }, { status: 404 });
  }

  if (intent === 'delete-connection') {
    const deleted = await deleteConnectionRecord(env.DB, profile.id, accountId);
    return deleted
      ? { message: 'Connection record deleted' }
      : data({ error: 'That connection no longer exists.' }, { status: 404 });
  }

  if (intent === 'clear-error') {
    const cleared = await clearConnectionError(env.DB, profile.id, accountId);
    return cleared
      ? { message: 'Connection error dismissed' }
      : data({ error: 'That connection no longer exists.' }, { status: 404 });
  }

  if (intent === 'add-public-link') {
    const account = await env.DB.prepare(
      `SELECT provider, provider_handle AS handle, display_name AS displayName
         FROM connected_accounts
        WHERE id = ?1 AND profile_id = ?2 AND connection_status = 'connected'`,
    )
      .bind(accountId, profile.id)
      .first<{ provider: string; handle: string | null; displayName: string | null }>();
    if (!account)
      return data({ error: 'That connected account is no longer available.' }, { status: 404 });

    const existing = await env.DB.prepare(
      'SELECT id FROM profile_links WHERE profile_id = ?1 AND connected_account_id = ?2 AND is_active = 1',
    )
      .bind(profile.id, accountId)
      .first();
    if (existing) return { message: 'This account is already included in your public links' };

    const platformKey = normalizeProvider(account.provider);
    const platform = getLinkPlatform(platformKey);
    if (!platform || !account.handle)
      return data(
        { error: 'This connection does not have a public profile address to add yet.' },
        { status: 400 },
      );

    await createProfileLink(env.DB, profile.id, {
      label: platform.name,
      url: platformUrl(platform, account.handle),
      publicationStatus: 'live',
      platformKey: platform.id,
      connectedAccountId: accountId,
    });
    return { message: `${platform.name} added to your public links` };
  }

  if (intent === 'sync-github-profile') {
    try {
      const fields = await syncGitHubProfile(env, { accountId, profile });
      return {
        message: `GitHub updated: ${fields.length} ${fields.length === 1 ? 'field' : 'fields'}`,
      };
    } catch (error) {
      console.error('GitHub profile sync failed', error);
      return data(
        { error: error instanceof Error ? error.message : 'GitHub profile sync failed.' },
        { status: 502 },
      );
    }
  }

  if (intent === 'sync-twitch-profile') {
    try {
      await syncTwitchProfile(env, { accountId, profile });
      return { message: 'Twitch channel description updated' };
    } catch (error) {
      console.error('Twitch profile sync failed', error);
      return data(
        { error: error instanceof Error ? error.message : 'Twitch profile sync failed.' },
        { status: 502 },
      );
    }
  }

  return data({ error: 'Unknown connection action.' }, { status: 400 });
}

export default function Connections({ loaderData }: Route.ComponentProps) {
  return <ConnectionsWorkspace {...loaderData} />;
}
