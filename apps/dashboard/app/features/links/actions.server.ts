import type { LinkInput } from './schema';

export async function createLinkCollection(db: D1Database, profileId: string, title: string) {
  await db.prepare(`INSERT INTO link_collections (id, profile_id, title, position) VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(position), -1) + 1 FROM link_collections WHERE profile_id = ?2))`).bind(crypto.randomUUID(), profileId, title).run();
}

export async function createProfileLink(db: D1Database, profileId: string, input: LinkInput) {
  await db
    .prepare(
      `INSERT INTO profile_links (id, profile_id, label, url, position, publication_status, starts_at, ends_at)
       VALUES (?1, ?2, ?3, ?4, (SELECT COALESCE(MAX(position), -1) + 1 FROM profile_links WHERE profile_id = ?2), ?5, ?6, ?7)`,
    )
    .bind(
      crypto.randomUUID(),
      profileId,
      input.label,
      input.url,
      input.publicationStatus,
      input.startsAt || null,
      input.endsAt || null,
    )
    .run();
}

export async function updateProfileLink(
  db: D1Database,
  profileId: string,
  linkId: string,
  input: LinkInput,
) {
  const result = await db
    .prepare(
      'UPDATE profile_links SET label = ?3, url = ?4, publication_status = ?5, starts_at = ?6, ends_at = ?7, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?2 AND is_active = 1',
    )
    .bind(
      linkId,
      profileId,
      input.label,
      input.url,
      input.publicationStatus,
      input.startsAt || null,
      input.endsAt || null,
    )
    .run();

  return result.meta.changes > 0;
}

export async function deleteProfileLink(db: D1Database, profileId: string, linkId: string) {
  const result = await db
    .prepare('DELETE FROM profile_links WHERE id = ?1 AND profile_id = ?2')
    .bind(linkId, profileId)
    .run();

  return result.meta.changes > 0;
}

export async function moveProfileLink(
  db: D1Database,
  profileId: string,
  linkId: string,
  direction: 'up' | 'down',
) {
  const links = await db
    .prepare(
      'SELECT id, position FROM profile_links WHERE profile_id = ?1 AND is_active = 1 ORDER BY position, created_at',
    )
    .bind(profileId)
    .all<{ id: string; position: number }>();
  const entries = links.results ?? [];
  const index = entries.findIndex((link) => link.id === linkId);
  const adjacent = entries[index + (direction === 'up' ? -1 : 1)];

  if (index < 0 || !adjacent) return false;

  await db.batch([
    db
      .prepare(
        'UPDATE profile_links SET position = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?3',
      )
      .bind(linkId, adjacent.position, profileId),
    db
      .prepare(
        'UPDATE profile_links SET position = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND profile_id = ?3',
      )
      .bind(adjacent.id, entries[index].position, profileId),
  ]);

  return true;
}
