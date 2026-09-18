import { Navigate } from 'react-router';

import { readLastUsedSlug, useWorkspaces } from '../../lib/workspaces';

/**
 * `/app` names no workspace, so resolve one: the last one used if it is still
 * reachable, otherwise the account's own. The stored preference never overrides
 * a workspace named in the URL — it only answers this question.
 */
export default function AppIndexRedirect() {
  const workspaces = useWorkspaces();

  if (!workspaces.length) return null;

  const remembered = readLastUsedSlug();
  const target = workspaces.find((workspace) => workspace.slug === remembered) ?? workspaces[0];

  return <Navigate replace to={`/app/${target.slug}`} />;
}
