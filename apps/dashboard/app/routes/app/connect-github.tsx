import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import {
  buildGitHubAuthorizationUrl,
  buildGitHubInstallationUrl,
  createGitHubPkcePair,
  githubIsConfigured,
} from '../../features/connections/github.server';
import { cloudflare } from '../../lib/cloudflare';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/connect-github';

// Installation adds a user-facing step before OAuth, so allow enough time to
// finish both screens while retaining a short-lived, single-use state record.
const STATE_TTL_SECONDS = 20 * 60;

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');
  if (!githubIsConfigured(env)) {
    throw redirect(`/app/${workspace.slug}/connections/new?oauth_error=github_not_configured`);
  }

  const profile = await env.DB.prepare('SELECT id FROM profiles WHERE workspace_id = ?1')
    .bind(workspace.id)
    .first<{ id: string }>();
  if (!profile) throw new Response('This workspace has no profile.', { status: 404 });

  const state = crypto.randomUUID();
  const pkce = await createGitHubPkcePair();
  await env.OAUTH_STATE.put(
    `github:${state}`,
    JSON.stringify({
      userId,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      profileId: profile.id,
      codeVerifier: pkce.verifier,
      expiresAt: Date.now() + STATE_TTL_SECONDS * 1_000,
    }),
    { expirationTtl: STATE_TTL_SECONDS },
  );

  throw redirect(buildGitHubInstallationUrl({ appSlug: env.GITHUB_APP_SLUG, state }));
}
