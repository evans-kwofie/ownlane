import { z } from 'zod';

/** What `PushSubscription.toJSON()` gives the browser, validated at the boundary. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export async function savePushSubscription(
  db: D1Database,
  input: { userId: string; workspaceId: string; endpoint: string; p256dh: string; auth: string },
) {
  // Re-subscribing in the same browser returns the same endpoint. Upsert so it
  // re-attaches to the current user and clears any earlier failure.
  await db
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, workspace_id, endpoint, p256dh, auth)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         workspace_id = excluded.workspace_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         failed_at = NULL`,
    )
    .bind(
      crypto.randomUUID(),
      input.userId,
      input.workspaceId,
      input.endpoint,
      input.p256dh,
      input.auth,
    )
    .run();
}

export async function deletePushSubscription(db: D1Database, userId: string, endpoint: string) {
  await db
    .prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?1 AND user_id = ?2`)
    .bind(endpoint, userId)
    .run();
}

export async function countPushSubscriptions(db: D1Database, workspaceId: string) {
  const row = await db
    .prepare(
      `SELECT count(*) AS total FROM push_subscriptions
        WHERE workspace_id = ?1 AND failed_at IS NULL`,
    )
    .bind(workspaceId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/**
 * What the service worker shows. Read at delivery time rather than carried in
 * the push, so a notification opened later still says something true.
 *
 * The notification deliberately opens the app root rather than selecting a
 * workspace: a browser may be subscribed to more than one workspace.
 */
export async function readUnreadSummary(db: D1Database, userId: string) {
  const summary = await db
    .prepare(
      `SELECT count(*) AS total
         FROM leads l
         JOIN profiles p ON p.id = l.profile_id
         JOIN workspaces w ON w.id = p.workspace_id
         JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ?1
        WHERE l.read_at IS NULL AND l.status <> 'spam'
      `,
    )
    .bind(userId)
    .first<{ total: number }>();

  if (!summary?.total) return null;

  const newest = await db
    .prepare(
      `SELECT l.name
         FROM leads l
         JOIN profiles p ON p.id = l.profile_id
         JOIN workspaces w ON w.id = p.workspace_id
         JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = ?1
        WHERE l.read_at IS NULL AND l.status <> 'spam'
        ORDER BY l.created_at DESC
        LIMIT 1`,
    )
    .bind(userId)
    .first<{ name: string }>();

  return {
    count: summary.total,
    name: newest?.name ?? null,
    url: '/app',
  };
}
