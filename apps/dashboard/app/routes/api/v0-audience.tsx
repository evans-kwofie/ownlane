import { authorize, apiOk } from '../../features/api/respond.server';
import { cloudflare } from '../../lib/cloudflare';
import type { Route } from './+types/v0-audience';

/**
 * GET /v0/workspaces/:workspace/audience
 *
 * Deliberately separate from the leads endpoint. A reporting integration wants
 * to know how many enquiries arrived; it has no business holding the name and
 * email address of everybody who sent one.
 */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const auth = await authorize(env, args.request, args.params, 'audience:read');
  if (!auth.ok) return auth.response;

  const [totals, sources] = await Promise.all([
    env.DB.prepare(
      `SELECT count(*) AS total,
              count(CASE WHEN status = 'new' THEN 1 END) AS new,
              count(CASE WHEN status = 'replied' THEN 1 END) AS replied,
              count(CASE WHEN status = 'won' THEN 1 END) AS won,
              count(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 END) AS last_30_days
         FROM leads WHERE profile_id = ?1 AND status <> 'spam'`,
    )
      .bind(auth.profileId)
      .first<Record<string, number>>(),
    env.DB.prepare(
      `SELECT coalesce(nullif(utm_source, ''), 'direct') AS source, count(*) AS total
         FROM leads WHERE profile_id = ?1 AND status <> 'spam'
        GROUP BY source ORDER BY total DESC LIMIT 10`,
    )
      .bind(auth.profileId)
      .all<{ source: string; total: number }>(),
  ]);

  return apiOk({
    total: totals?.total ?? 0,
    by_status: {
      new: totals?.new ?? 0,
      replied: totals?.replied ?? 0,
      won: totals?.won ?? 0,
    },
    last_30_days: totals?.last_30_days ?? 0,
    sources: sources.results ?? [],
  });
}
