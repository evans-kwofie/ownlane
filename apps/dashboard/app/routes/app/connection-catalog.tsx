import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import { ConnectionPlatformBrowser } from '../../components/features/connections/connection-platform-browser';
import { githubIsConfigured } from '../../features/connections/github.server';
import { listConnectedAccounts } from '../../features/connections/queries.server';
import { twitchIsConfigured } from '../../features/connections/twitch.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/connection-catalog';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Browse connection platforms — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  const profile = await readProfile(env.DB, workspace.id);
  const accounts = profile ? await listConnectedAccounts(env.DB, profile.id) : [];
  return {
    enabledProviders: [githubIsConfigured(env) ? 'github' : null, twitchIsConfigured(env) ? 'twitch' : null].filter((provider): provider is string => Boolean(provider)),
    connectedProviders: [...new Set(accounts.filter((account) => account.status === 'connected').map((account) => account.provider))],
  };
}

export default function ConnectionCatalog({ loaderData }: Route.ComponentProps) {
  return <ConnectionPlatformBrowser {...loaderData} />;
}
