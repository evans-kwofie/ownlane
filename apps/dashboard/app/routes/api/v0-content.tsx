import { authorize, apiOk } from '../../features/api/respond.server';
import { cloudflare } from '../../lib/cloudflare';
import type { Route } from './+types/v0-content';

/** GET /v0/workspaces/:workspace/content */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const auth = await authorize(env, args.request, args.params, 'content:read');
  if (!auth.ok) return auth.response;

  const rows = await env.DB.prepare(
    `SELECT id, provider, kind, title, description, url, image_url, published_at, is_featured
       FROM content_items
      WHERE profile_id = ?1
      ORDER BY is_featured DESC, published_at DESC
      LIMIT 100`,
  )
    .bind(auth.profileId)
    .all<Record<string, string | number | null>>();

  return apiOk(
    (rows.results ?? []).map((row) => ({
      id: row.id,
      provider: row.provider,
      kind: row.kind,
      title: row.title,
      description: row.description,
      url: row.url,
      image_url: row.image_url,
      published_at: row.published_at,
      featured: Boolean(row.is_featured),
    })),
  );
}
