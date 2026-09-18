import { useEffect } from 'react';
import { Outlet } from 'react-router';

import { AppShell } from '../../components/app-shell';
import { NoWorkspaceAccess } from '../../components/no-workspace-access';
import { rememberLastUsedSlug, useActiveWorkspace, useWorkspaces } from '../../lib/workspaces';

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
