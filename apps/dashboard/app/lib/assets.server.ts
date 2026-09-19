import { ASSET_LIMITS, titleFromFilename, type AssetKind } from './assets';

/** Uploads land in R2 and are tracked as rows, so nothing becomes an orphan. */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type StoredAsset = { id: string; contentType: string; bytes: number };

export async function storeImage(
  env: Env,
  input: {
    workspaceId: string;
    file: File;
    kind: AssetKind;
    width?: number;
    height?: number;
    title?: string;
    altText?: string;
  },
): Promise<{ asset: StoredAsset | null; error: string | null }> {
  if (!IMAGE_TYPES.includes(input.file.type)) {
    return { asset: null, error: 'Use a JPEG, PNG or WebP image.' };
  }

  if (input.file.size > MAX_IMAGE_BYTES) {
    return { asset: null, error: 'Images must be under 5 MB.' };
  }

  const extension = input.file.type.split('/')[1].replace('jpeg', 'jpg');
  const id = crypto.randomUUID();
  const storageKey = `workspaces/${input.workspaceId}/assets/${id}.${extension}`;

  const bytes = await input.file.arrayBuffer();
  const measured = measureImage(new Uint8Array(bytes), input.file.type);

  await env.ASSETS_BUCKET.put(storageKey, bytes, {
    httpMetadata: { contentType: input.file.type },
  });

  await env.DB.prepare(
    `INSERT INTO assets (id, workspace_id, storage_key, kind, content_type, bytes, width, height,
                         original_name, title, alt_text)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
  )
    .bind(
      id,
      input.workspaceId,
      storageKey,
      input.kind,
      input.file.type,
      input.file.size,
      input.width ?? measured?.width ?? null,
      input.height ?? measured?.height ?? null,
      input.file.name || null,
      (input.title ?? titleFromFilename(input.file.name || '')).slice(0, ASSET_LIMITS.title) ||
        null,
      input.altText?.slice(0, ASSET_LIMITS.altText) || null,
    )
    .run();

  return { asset: { id, contentType: input.file.type, bytes: input.file.size }, error: null };
}

/** Points a profile column at an asset, replacing whatever was there. */
export async function setProfileImage(
  db: D1Database,
  profileId: string,
  column: 'avatar_key' | 'cover_key' | 'logo_key',
  assetId: string | null,
): Promise<void> {
  await db
    .prepare(`UPDATE profiles SET ${column} = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2`)
    .bind(assetId, profileId)
    .run();
}

export type AssetRecord = {
  id: string;
  kind: AssetKind;
  title: string | null;
  description: string | null;
  altText: string | null;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  originalName: string | null;
  createdAt: string;
  /** Where this asset is currently used, if anywhere. */
  usedAs: 'avatar' | 'logo' | 'cover' | 'link-thumbnail' | null;
};

/** Everything in a workspace's library, newest first, with its current use. */
export async function listAssets(db: D1Database, workspaceId: string): Promise<AssetRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.kind, a.content_type AS contentType, a.bytes, a.width, a.height,
              a.original_name AS originalName, a.title, a.description, a.alt_text AS altText,
              a.created_at AS createdAt,
              CASE
                WHEN p.avatar_key = a.id THEN 'avatar'
                WHEN p.logo_key = a.id THEN 'logo'
                WHEN p.cover_key = a.id THEN 'cover'
                WHEN EXISTS (SELECT 1 FROM profile_links l WHERE l.thumbnail_asset_id = a.id)
                  THEN 'link-thumbnail'
                ELSE NULL
              END AS usedAs
         FROM assets a
         LEFT JOIN profiles p ON p.workspace_id = a.workspace_id
        WHERE a.workspace_id = ?1
        ORDER BY a.created_at DESC`,
    )
    .bind(workspaceId)
    .all<AssetRecord>();

  return results ?? [];
}

/**
 * Removes the file and its row together, and lets go of it anywhere a profile
 * was pointing at it — a deleted image must not leave a broken reference.
 */
export async function deleteAsset(
  env: Env,
  workspaceId: string,
  assetId: string,
): Promise<{ error: string | null }> {
  const asset = await env.DB.prepare(
    'SELECT storage_key FROM assets WHERE id = ?1 AND workspace_id = ?2',
  )
    .bind(assetId, workspaceId)
    .first<{ storage_key: string }>();

  if (!asset) return { error: 'That asset no longer exists.' };

  await env.ASSETS_BUCKET.delete(asset.storage_key);

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE profiles
          SET avatar_key = CASE WHEN avatar_key = ?1 THEN NULL ELSE avatar_key END,
              logo_key = CASE WHEN logo_key = ?1 THEN NULL ELSE logo_key END,
              cover_key = CASE WHEN cover_key = ?1 THEN NULL ELSE cover_key END,
              updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?2`,
    ).bind(assetId, workspaceId),
    env.DB.prepare(
      `UPDATE profile_links
          SET thumbnail_asset_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE thumbnail_asset_id = ?1
          AND profile_id IN (SELECT id FROM profiles WHERE workspace_id = ?2)`,
    ).bind(assetId, workspaceId),
    env.DB.prepare('DELETE FROM assets WHERE id = ?1 AND workspace_id = ?2').bind(
      assetId,
      workspaceId,
    ),
  ]);

  return { error: null };
}

/**
 * Updates what a person wrote about an asset. The filename it arrived with is
 * never overwritten — that is how you find it again on your own disk.
 */
export async function describeAsset(
  db: D1Database,
  workspaceId: string,
  assetId: string,
  fields: { title: string; description: string; altText: string; kind: AssetKind },
): Promise<void> {
  await db
    .prepare(
      `UPDATE assets
          SET title = ?1, description = ?2, alt_text = ?3, kind = ?4
        WHERE id = ?5 AND workspace_id = ?6`,
    )
    .bind(
      fields.title.slice(0, ASSET_LIMITS.title) || null,
      fields.description.slice(0, ASSET_LIMITS.description) || null,
      fields.altText.slice(0, ASSET_LIMITS.altText) || null,
      fields.kind,
      assetId,
      workspaceId,
    )
    .run();
}

/**
 * Reads the pixel dimensions out of the file's own header. Workers have no
 * image decoder, and a library that cannot say how big a picture is cannot warn
 * that a platform will reject it.
 */
function measureImage(
  bytes: Uint8Array,
  contentType: string,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  try {
    if (contentType === 'image/png' && bytes.length > 24) {
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    if (contentType === 'image/jpeg') {
      let offset = 2;

      while (offset < bytes.length) {
        if (view.getUint8(offset) !== 0xff) break;

        const marker = view.getUint8(offset + 1);
        const length = view.getUint16(offset + 2);

        // SOF0…SOF15, excluding the four that are not frame headers.
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
        }

        offset += 2 + length;
      }
    }

    if (contentType === 'image/webp' && bytes.length > 30) {
      const format = String.fromCharCode(...bytes.slice(12, 16));

      if (format === 'VP8X') {
        const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));

        return { width, height };
      }

      if (format === 'VP8 ') {
        return {
          width: view.getUint16(26, true) & 0x3fff,
          height: view.getUint16(28, true) & 0x3fff,
        };
      }

      if (format === 'VP8L') {
        const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);

        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    // A header we cannot read is not worth failing an upload over.
  }

  return null;
}

/** Exposed for tests: header parsing is easy to get subtly wrong. */
export const __measureForTests = measureImage;
