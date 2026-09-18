import type { LinkCollection, ProfileLink } from './schema';

export async function listLinkCollections(db: D1Database, profileId: string): Promise<LinkCollection[]> {
  const rows = await db.prepare(`SELECT c.id, c.title, c.position, c.is_active AS isActive, count(l.id) AS linkCount FROM link_collections c LEFT JOIN profile_links l ON l.collection_id = c.id AND l.is_active = 1 WHERE c.profile_id = ?1 GROUP BY c.id ORDER BY c.position, c.created_at`).bind(profileId).all<LinkCollection>();
  return rows.results ?? [];
}

/** Links stay scoped through the profile, never by an untrusted browser-supplied profile id. */
export async function listProfileLinks(db: D1Database, profileId: string): Promise<ProfileLink[]> {
  const rows = await db
    .prepare(
      'SELECT id, label, url, position, collection_id AS collectionId, publication_status AS publicationStatus, starts_at AS startsAt, ends_at AS endsAt FROM profile_links WHERE profile_id = ?1 AND is_active = 1 ORDER BY position, created_at',
    )
    .bind(profileId)
    .all<ProfileLink>();

  return rows.results ?? [];
}

export async function readProfileLink(db: D1Database, profileId: string, linkId: string) {
  return db
    .prepare(
      'SELECT id, label, url, position, collection_id AS collectionId, publication_status AS publicationStatus, starts_at AS startsAt, ends_at AS endsAt FROM profile_links WHERE id = ?1 AND profile_id = ?2 AND is_active = 1',
    )
    .bind(linkId, profileId)
    .first<ProfileLink>();
}
