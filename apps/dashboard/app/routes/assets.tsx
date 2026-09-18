import { getAuth } from '@clerk/react-router/server';

import { cloudflare } from '../lib/cloudflare';
import type { Route } from './+types/assets';

/**
 * Serves an uploaded image from R2. The bucket stays private: access is checked
 * here, and the URL carries the asset id rather than the storage key.
 */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  const { env } = args.context.get(cloudflare);

  const asset = await env.DB.prepare(
    `SELECT a.storage_key, a.content_type, p.visibility
       FROM assets a
       JOIN workspaces w ON w.id = a.workspace_id
       LEFT JOIN profiles p ON p.workspace_id = w.id
      WHERE a.id = ?1`,
  )
    .bind(args.params.id)
    .first<{ storage_key: string; content_type: string; visibility: string | null }>();

  if (!asset) throw new Response('Not found', { status: 404 });

  // A private profile's media is only for people who can reach the workspace.
  if (asset.visibility !== 'public') {
    if (!userId) throw new Response('Not found', { status: 404 });

    const member = await env.DB.prepare(
      `SELECT 1 FROM assets a
         JOIN workspace_members m ON m.workspace_id = a.workspace_id
        WHERE a.id = ?1 AND m.user_id = ?2`,
    )
      .bind(args.params.id, userId)
      .first();

    if (!member) throw new Response('Not found', { status: 404 });
  }

  const object = await env.ASSETS_BUCKET.get(asset.storage_key);
  if (!object) throw new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': asset.content_type,
      'Cache-Control':
        asset.visibility === 'public'
          ? 'public, max-age=31536000, immutable'
          : 'private, max-age=3600',
      ETag: object.httpEtag,
    },
  });
}
