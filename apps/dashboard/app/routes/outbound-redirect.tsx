import { redirect } from 'react-router';
import { recordAnalyticsEvent } from '../features/analytics/events.server';
import { cloudflare } from '../lib/cloudflare';
import type { Route } from './+types/outbound-redirect';

type Destination = { id: string; profileId: string; url: string };

export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const destination = await findPublicDestination(
    env.DB,
    args.params.kind,
    args.params.destinationId,
  );
  if (!destination) throw new Response('Not found', { status: 404 });

  const result = await recordAnalyticsEvent(env, args.request, {
    profileId: destination.profileId,
    type: 'outbound_click',
    destination: { type: args.params.kind as 'link' | 'content', id: destination.id },
  });

  throw redirect(destination.url, {
    headers: {
      'Cache-Control': 'no-store',
      ...(result.setCookie ? { 'Set-Cookie': result.setCookie } : {}),
    },
  });
}

async function findPublicDestination(
  db: D1Database,
  kind: string | undefined,
  id: string | undefined,
) {
  if (!id || (kind !== 'link' && kind !== 'content')) return null;

  if (kind === 'content') {
    return db
      .prepare(
        `SELECT c.id, c.profile_id AS profileId, c.url
           FROM content_items c
           JOIN profiles p ON p.id = c.profile_id
          WHERE c.id = ?1 AND c.is_featured = 1 AND p.visibility = 'public'`,
      )
      .bind(id)
      .first<Destination>();
  }

  return db
    .prepare(
      `SELECT l.id, l.profile_id AS profileId, l.url
         FROM profile_links l
         JOIN profiles p ON p.id = l.profile_id
         LEFT JOIN link_collections c ON c.id = l.collection_id
        WHERE l.id = ?1 AND p.visibility = 'public' AND l.is_active = 1
          AND (l.collection_id IS NULL OR c.is_active = 1)
          AND (l.publication_status = 'live'
            OR (l.publication_status = 'scheduled' AND datetime(l.starts_at) <= CURRENT_TIMESTAMP
                AND (l.ends_at IS NULL OR datetime(l.ends_at) > CURRENT_TIMESTAMP)))`,
    )
    .bind(id)
    .first<Destination>();
}
