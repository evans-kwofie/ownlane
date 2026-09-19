import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import { ConnectionPlatformBrowser } from '../../components/features/connections/connection-platform-browser';
import { cloudflare } from '../../lib/cloudflare';
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

  return { enabledProviders: [] as string[] };
}

export default function ConnectionCatalog({ loaderData }: Route.ComponentProps) {
  return <ConnectionPlatformBrowser {...loaderData} />;
}
