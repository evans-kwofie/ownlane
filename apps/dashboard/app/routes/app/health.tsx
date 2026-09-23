import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import { refreshConnectedIdentities } from '../../features/connections/identity-refresh.server';
import { refreshHandleCoverage } from '../../features/connections/handle-coverage.server';

import { HealthWorkspace } from '../../components/features/health/health-workspace';
import { runHealthChecks } from '../../features/health/checks';
import { readHealthSignals } from '../../features/health/queries.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/health';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Identity health — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env, ctx } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });

  // Top up any connection whose identity has gone stale, after the response has
  // been sent. The page never waits on two provider APIs, and the reader is not
  // asked to press a button to close a gap Ownlane can close itself. This view
  // still reflects the previous read; the next one reflects this refresh.
  ctx.waitUntil(
    refreshConnectedIdentities(env, profile.id, { onlyStale: true }).catch(() => undefined),
  );
  // Handle coverage is slower and changes rarely, so it refreshes weekly rather
  // than daily, and likewise never blocks the response.
  ctx.waitUntil(refreshHandleCoverage(env, profile.id).catch(() => undefined));

  // Checks run on read. They are all aggregates over a single profile, so there
  // is nothing to cache that would not go stale the moment anything is edited.
  const signals = await readHealthSignals(env.DB, profile.id);
  return { report: runHealthChecks(signals) };
}

/**
 * Re-check reads each connected provider back before re-running the checks.
 * The loader never does this on its own: a page render should not make outbound
 * calls to two APIs, and provider rate limits are not a per-page-view budget.
 */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });

  const refreshed = await refreshConnectedIdentities(env, profile.id);
  const failed = refreshed.filter((result) => !result.ok);

  if (failed.length) {
    return {
      saved: `Checked ${refreshed.length - failed.length} of ${refreshed.length} platforms`,
      error: `Could not read ${failed.map((result) => result.provider).join(', ')}.`,
    };
  }
  return {
    saved: refreshed.length
      ? `Read back ${refreshed.length} connected ${refreshed.length === 1 ? 'platform' : 'platforms'}`
      : 'Re-checked',
  };
}

export default function Health({ loaderData }: Route.ComponentProps) {
  return <HealthWorkspace report={loaderData.report} />;
}
