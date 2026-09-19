import type { LinkCollection, ProfileLink } from './schema';

export async function listLinkCollections(
  db: D1Database,
  profileId: string,
): Promise<LinkCollection[]> {
  const rows = await db
    .prepare(
      `SELECT c.id, c.title, c.description, c.layout, c.position, c.is_active AS isActive, count(l.id) AS linkCount FROM link_collections c LEFT JOIN profile_links l ON l.collection_id = c.id AND l.is_active = 1 WHERE c.profile_id = ?1 GROUP BY c.id ORDER BY c.position, c.created_at`,
    )
    .bind(profileId)
    .all<LinkCollection>();
  return rows.results ?? [];
}

/** Links stay scoped through the profile, never by an untrusted browser-supplied profile id. */
export async function listProfileLinks(db: D1Database, profileId: string): Promise<ProfileLink[]> {
  const rows = await db
    .prepare(
      'SELECT id, label, url, position, collection_id AS collectionId, thumbnail_asset_id AS thumbnailAssetId, platform_key AS platformKey, connected_account_id AS connectedAccountId, publication_status AS publicationStatus, starts_at AS startsAt, ends_at AS endsAt FROM profile_links WHERE profile_id = ?1 AND is_active = 1 ORDER BY position, created_at',
    )
    .bind(profileId)
    .all<ProfileLink>();

  return rows.results ?? [];
}

export type ConnectedAccountLinkSuggestion = {
  id: string;
  provider: string;
  handle: string | null;
  status: string;
};

export async function listConnectedAccountLinkSuggestions(
  db: D1Database,
  profileId: string,
): Promise<ConnectedAccountLinkSuggestion[]> {
  const rows = await db
    .prepare(
      `SELECT id, provider, provider_handle AS handle, connection_status AS status
         FROM connected_accounts
        WHERE profile_id = ?1 AND connection_status = 'connected'
        ORDER BY provider, created_at`,
    )
    .bind(profileId)
    .all<ConnectedAccountLinkSuggestion>();
  return rows.results ?? [];
}
