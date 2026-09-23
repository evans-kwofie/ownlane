import { getAuth } from '@clerk/react-router/server';
import { data } from 'react-router';

import {
  deletePushSubscription,
  pushSubscriptionSchema,
  savePushSubscription,
} from '../../features/notifications/subscriptions.server';
import { cloudflare } from '../../lib/cloudflare';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/audience-push';

/** Subscribes or unsubscribes this browser from lead notifications. */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });

  const body = await args.request.json().catch(() => null);
  const intent = (body as { intent?: unknown } | null)?.intent;

  if (intent === 'unsubscribe') {
    const endpoint = (body as { endpoint?: unknown }).endpoint;
    if (typeof endpoint !== 'string') return data({ error: 'Missing endpoint.' }, { status: 400 });
    await deletePushSubscription(env.DB, userId, endpoint);
    return { saved: 'Notifications turned off' };
  }

  const parsed = pushSubscriptionSchema.safeParse(
    (body as { subscription?: unknown } | null)?.subscription,
  );
  if (!parsed.success) return data({ error: 'That subscription was not usable.' }, { status: 400 });

  await savePushSubscription(env.DB, {
    userId,
    workspaceId: workspace.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  return { saved: 'Notifications on for this browser' };
}
