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
import { connectionPreferencesSchema } from '../../features/connections/schema';
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
  return {
    accounts: await listConnectedAccounts(env.DB, profile.id),
    // Providers are enabled only after a real OAuth adapter and credentials exist.
    enabledProviders: [] as string[],
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

  return data({ error: 'Unknown connection action.' }, { status: 400 });
}

export default function Connections({ loaderData }: Route.ComponentProps) {
  return <ConnectionsWorkspace {...loaderData} />;
}
