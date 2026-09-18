import { createClerkClient, getAuth } from '@clerk/react-router/server';
import { Outlet, redirect } from 'react-router';

import { cloudflare } from '../../lib/cloudflare';
import { ensureWorkspaces, toSlug } from '../../lib/workspaces.server';
import type { Route } from './+types/layout';

/**
 * Gate for everything under /app. The session is verified on the server, and
 * the account's workspaces are loaded once here — every page below reads them
 * rather than fetching again.
 */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env } = args.context.get(cloudflare);
  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
  });
  const user = await clerk.users.getUser(userId);

  const email = user.primaryEmailAddress?.emailAddress ?? '';
  const handle = user.username || email.split('@')[0] || 'me';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || handle;

  // In development this resolves to the dev server, so the link previews the
  // profile you are actually working on.
  const publicSiteOrigin = env.PUBLIC_SITE_ORIGIN?.trim() || new URL(args.request.url).origin;

  const workspaces = await ensureWorkspaces(env.DB, {
    userId,
    preferredSlug: toSlug(handle),
    name,
  });

  return { workspaces, publicSiteOrigin };
}

export default function AppLayout() {
  return <Outlet />;
}
