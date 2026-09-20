import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import {
  buildGitHubAuthorizationUrl,
  githubIsConfigured,
} from '../features/connections/github.server';
import { cloudflare } from '../lib/cloudflare';
import type { Route } from './+types/oauth.github.setup';

type PendingGitHubConnection = {
  userId: string;
  codeVerifier: string;
  expiresAt: number;
};

/**
 * GitHub returns here after App installation. Its installation URL preserves
 * our state value, letting us continue directly into user authorization.
 */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const stateKey = new URL(args.request.url).searchParams.get('state');
  if (!stateKey || !githubIsConfigured(env)) throw redirect('/app');

  const state = await env.OAUTH_STATE.get<PendingGitHubConnection>(`github:${stateKey}`, 'json');
  if (!state || state.userId !== userId || state.expiresAt < Date.now() || !state.codeVerifier)
    throw redirect('/app');

  const redirectUri = new URL('/oauth/callback/github', args.request.url).toString();
  throw redirect(
    buildGitHubAuthorizationUrl({
      clientId: env.GITHUB_CLIENT_ID,
      codeChallenge: await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(state.codeVerifier))
        .then((digest) => {
          let binary = '';
          for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
          return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
        }),
      redirectUri,
      state: stateKey,
    }),
  );
}
