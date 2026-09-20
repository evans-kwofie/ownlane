import type { ContentItem } from './schema';
export async function listContentItems(db: D1Database, profileId: string): Promise<ContentItem[]> {
  type ContentRow = Omit<ContentItem, 'isFeatured'> & { isFeatured: number };
  const rows = await db
    .prepare(
      `SELECT id, connected_account_id AS connectedAccountId, provider, kind, title, description, url, image_url AS imageUrl, published_at AS publishedAt, is_featured AS isFeatured, imported_at AS importedAt FROM content_items WHERE profile_id=?1 ORDER BY is_featured DESC, COALESCE(published_at, imported_at) DESC`,
    )
    .bind(profileId)
    .all<ContentRow>();
  return (rows.results ?? []).map((item) => ({
    ...item,
    description: item.description ?? '',
    isFeatured: Boolean(item.isFeatured),
  }));
}
