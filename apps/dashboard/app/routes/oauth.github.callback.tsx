import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import { connectGitHubAccount, githubIsConfigured } from '../features/connections/github.server';
import { cloudflare } from '../lib/cloudflare';
import { getWorkspaceForUser } from '../lib/workspaces.server';
import type { Route } from './+types/oauth.github.callback';

type OAuthState = {
  userId: string;
  workspaceId: string;
  workspaceSlug: string;
  profileId: string;
  codeVerifier: string;
  expiresAt: number;
};

function catalogPath(workspaceSlug: string, error: string) {
  return `/app/${workspaceSlug}/connections/new?oauth_error=${encodeURIComponent(error)}`;
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const url = new URL(args.request.url);
  const stateKey = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const providerError = url.searchParams.get('error');

  if (!stateKey) throw redirect('/app');
  const storageKey = `github:${stateKey}`;
  const state = await env.OAUTH_STATE.get<OAuthState>(storageKey, 'json');
  await env.OAUTH_STATE.delete(storageKey);
  if (!state) throw redirect('/app');

  const fallback = catalogPath(state.workspaceSlug, providerError || 'authorization_failed');
  if (
    state.userId !== userId ||
    state.expiresAt < Date.now() ||
    !state.codeVerifier ||
    !code ||
    providerError ||
    !githubIsConfigured(env)
  ) {
    throw redirect(fallback);
  }

  const workspace = await getWorkspaceForUser(env.DB, userId, state.workspaceSlug);
  if (!workspace || workspace.id !== state.workspaceId) throw redirect('/app');
  const profile = await env.DB.prepare(
    'SELECT id FROM profiles WHERE id = ?1 AND workspace_id = ?2',
  )
    .bind(state.profileId, workspace.id)
    .first<{ id: string }>();
  if (!profile) throw redirect('/app');

  try {
    await connectGitHubAccount(env, {
      code,
      codeVerifier: state.codeVerifier,
      redirectUri: new URL('/oauth/callback/github', args.request.url).toString(),
      profileId: profile.id,
      userId,
    });
  } catch (error) {
    console.error('GitHub OAuth callback failed', error);
    throw redirect(catalogPath(workspace.slug, 'github_connection_failed'));
  }

  throw redirect(`/app/${workspace.slug}/connections?connected=github`);
}
