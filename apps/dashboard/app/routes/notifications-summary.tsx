import { getAuth } from '@clerk/react-router/server';

import { readUnreadSummary } from '../features/notifications/subscriptions.server';
import { cloudflare } from '../lib/cloudflare';
import type { Route } from './+types/notifications-summary';

/** What the service worker reads to build a notification. Never cached. */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const { env } = args.context.get(cloudflare);
  const summary = await readUnreadSummary(env.DB, userId);

  return new Response(JSON.stringify(summary ?? { count: 0 }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
