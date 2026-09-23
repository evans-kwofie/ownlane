import { authorize, apiOk } from '../../features/api/respond.server';
import { cloudflare } from '../../lib/cloudflare';
import type { Route } from './+types/v0-links';

/** GET /v0/workspaces/:workspace/links */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const auth = await authorize(env, args.request, args.params, 'links:read');
  if (!auth.ok) return auth.response;

  // Only what a visitor would already see. Scheduling windows and internal
  // ordering are Ownlane's business, not an integrator's.
  const rows = await env.DB.prepare(
    `SELECT id, label, url, position, platform_key
       FROM profile_links
      WHERE profile_id = ?1 AND is_active = 1
        AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
        AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
      ORDER BY position`,
  )
    .bind(auth.profileId)
    .all<Record<string, string | number | null>>();

  return apiOk(
    (rows.results ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      position: row.position,
      platform: row.platform_key,
    })),
  );
}
