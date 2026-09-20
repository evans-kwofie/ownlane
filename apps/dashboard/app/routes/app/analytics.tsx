import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';
import { AnalyticsWorkspace } from '../../components/features/analytics/analytics-workspace';
import { analyticsDateRange, readAnalyticsOverview } from '../../features/analytics/queries.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/analytics';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Analytics — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  const range = analyticsDateRange(new URL(args.request.url).searchParams);
  const overview = await readAnalyticsOverview(env.DB, profile.id, range);
  return { range, overview };
}

export default function Analytics({ loaderData }: Route.ComponentProps) {
  return <AnalyticsWorkspace {...loaderData} />;
}
