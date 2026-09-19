import type { LinkInput } from './schema';

export async function createLinkCollection(
  db: D1Database,
  profileId: string,
  input: {
    title: string;
    description?: string;
    layout?: 'list' | 'grid' | 'compact';
    isActive?: boolean;
  },
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO link_collections (id, profile_id, title, description, layout, is_active, position)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6,
         (SELECT COALESCE(MAX(position), -1) + 1 FROM link_collections WHERE profile_id = ?2))`,
    )
    .bind(
      id,
      profileId,
      input.title,
      input.description ?? '',
      input.layout ?? 'list',
      input.isActive === false ? 0 : 1,
    )
    .run();
  return id;
}

export async function createProfileLink(db: D1Database, profileId: string, input: LinkInput) {
  const id = crypto.randomUUID();
  await db.batch([
    db
      .prepare(
        'UPDATE profile_links SET position = position + 1, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ?1 AND collection_id IS ?2 AND is_active = 1',
      )
      .bind(profileId, input.collectionId || null),
    db
      .prepare(
        `INSERT INTO profile_links (id, profile_id, label, url, position, publication_status, starts_at, ends_at, thumbnail_asset_id, collection_id, platform_key, connected_account_id)
       VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
      .bind(
        id,
        profileId,
        input.label,
        input.url,
        input.publicationStatus,
        input.startsAt || null,
        input.endsAt || null,
        input.thumbnailAssetId || null,
        input.collectionId || null,
        input.platformKey || null,
        input.connectedAccountId || null,
      ),
  ]);
  return id;
}

export async function updateProfileLink(
  db: D1Database,
  profileId: string,
  linkId: string,
  input: LinkInput,
) {
  const result = await db
    .prepare(
      'UPDATE profile_links SET label = ?3, url = ?4, publication_status = ?5, starts_at = ?6, ends_at = ?7, thumbnail_asset_id = ?8, collection_id = ?9, platform_key = ?10, connected_account_id = ?11, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?2 AND is_active = 1',
    )
    .bind(
      linkId,
      profileId,
      input.label,
      input.url,
      input.publicationStatus,
      input.startsAt || null,
      input.endsAt || null,
      input.thumbnailAssetId || null,
      input.collectionId || null,
      input.platformKey || null,
      input.connectedAccountId || null,
    )
    .run();

  return result.meta.changes > 0;
}

export async function saveLinkCollection(
  db: D1Database,
  profileId: string,
  input: {
    id?: string;
    title: string;
    description: string;
    layout: 'list' | 'grid' | 'compact';
    isActive: boolean;
  },
) {
  if (!input.id) {
    return createLinkCollection(db, profileId, input);
  }
  const result = await db
    .prepare(
      'UPDATE link_collections SET title = ?3, description = ?4, layout = ?5, is_active = ?6, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?2',
    )
    .bind(input.id, profileId, input.title, input.description, input.layout, input.isActive ? 1 : 0)
    .run();
  return result.meta.changes ? input.id : null;
}

export async function deleteLinkCollection(
  db: D1Database,
  profileId: string,
  collectionId: string,
) {
  const result = await db
    .prepare('DELETE FROM link_collections WHERE id = ?1 AND profile_id = ?2')
    .bind(collectionId, profileId)
    .run();
  return result.meta.changes > 0;
}

export async function reorderLinkCollections(db: D1Database, profileId: string, ids: string[]) {
  const owned = await db
    .prepare('SELECT id FROM link_collections WHERE profile_id = ?1')
    .bind(profileId)
    .all<{ id: string }>();
  const allowed = new Set((owned.results ?? []).map((row) => row.id));
  if (
    ids.length !== allowed.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !allowed.has(id))
  )
    return false;
  await db.batch(
    ids.map((id, position) =>
      db
        .prepare(
          'UPDATE link_collections SET position = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?3',
        )
        .bind(id, position, profileId),
    ),
  );
  return true;
}

export async function reorderProfileLinks(
  db: D1Database,
  profileId: string,
  items: { id: string; collectionId: string | null }[],
) {
  const owned = await db
    .prepare('SELECT id FROM profile_links WHERE profile_id = ?1 AND is_active = 1')
    .bind(profileId)
    .all<{ id: string }>();
  const allowed = new Set((owned.results ?? []).map((row) => row.id));
  if (
    items.length !== allowed.size ||
    new Set(items.map((item) => item.id)).size !== items.length ||
    items.some((item) => !allowed.has(item.id))
  )
    return false;
  const collections = await db
    .prepare('SELECT id FROM link_collections WHERE profile_id = ?1')
    .bind(profileId)
    .all<{ id: string }>();
  const allowedCollections = new Set((collections.results ?? []).map((row) => row.id));
  if (items.some((item) => item.collectionId && !allowedCollections.has(item.collectionId)))
    return false;
  await db.batch(
    items.map((item, position) =>
      db
        .prepare(
          'UPDATE profile_links SET position = ?2, collection_id = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?4',
        )
        .bind(item.id, position, item.collectionId, profileId),
    ),
  );
  return true;
}

export async function deleteProfileLink(db: D1Database, profileId: string, linkId: string) {
  const result = await db
    .prepare('DELETE FROM profile_links WHERE id = ?1 AND profile_id = ?2')
    .bind(linkId, profileId)
    .run();

  return result.meta.changes > 0;
}
