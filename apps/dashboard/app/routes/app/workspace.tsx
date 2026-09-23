import { useEffect } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { Outlet, redirect } from 'react-router';

import { AppShell } from '../../components/app-shell';
import { NoWorkspaceAccess } from '../../components/no-workspace-access';
import { rememberLastUsedSlug, useActiveWorkspace, useWorkspaces } from '../../lib/workspaces';
import { cloudflare } from '../../lib/cloudflare';
import { getWorkspaceForUser, resolveRetiredSlug } from '../../lib/workspaces.server';
import type { Route } from './+types/workspace';

/**
 * Renaming a workspace changes the slug in every link to it. Rather than
 * breaking whatever was already bookmarked or shared, a retired slug resolves
 * once and redirects to the current address, keeping the rest of the path.
 *
 * This sits on the layout so it covers every route beneath it, and only runs
 * when the slug does not resolve — the normal case costs one query.
 */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return null;

  const { env } = args.context.get(cloudflare);
  const slug = args.params.workspace;
  if (await getWorkspaceForUser(env.DB, userId, slug)) return null;

  const current = await resolveRetiredSlug(env.DB, userId, slug);
  if (!current) return null; // Genuinely unreachable; the layout says so.

  const url = new URL(args.request.url);
  throw redirect(`${url.pathname.replace(`/app/${slug}`, `/app/${current}`)}${url.search}`);
}

/**
 * Everything under `/app/:workspace` is scoped to that identity. The slug is
 * checked against what this account can actually reach, so a guessed or stale
 * URL says so plainly instead of quietly showing someone else's data.
 */
export default function WorkspaceLayout() {
  const { workspace, slug } = useActiveWorkspace();
  const workspaces = useWorkspaces();

  useEffect(() => {
    if (workspace) rememberLastUsedSlug(workspace.slug);
  }, [workspace]);

  // Still resolving the account; the auth gate above already holds the screen.
  if (!workspaces.length) return null;

  if (!workspace) return <NoWorkspaceAccess slug={slug} />;

  return <AppShell />;
}
