/**
 * Asset vocabulary shared by the browser and the server. Storage access lives
 * in `assets.server.ts`; anything a component needs belongs here.
 */

export const ASSET_KINDS = ['image', 'logo', 'cover', 'document'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const KIND_LABELS: Record<AssetKind, string> = {
  image: 'Image',
  logo: 'Logo',
  cover: 'Cover',
  document: 'Document',
};

/** What each kind is for, so the choice is not a guess. */
export const KIND_HINTS: Record<AssetKind, string> = {
  image: 'Photographs and general imagery, including headshots.',
  logo: 'Marks and wordmarks. Platforms expect these square, with clear space.',
  cover: 'Wide banners and headers, cropped hard on most platforms.',
  document: 'Files that are downloaded rather than displayed.',
};

export const ASSET_LIMITS = { title: 120, description: 280, altText: 160 } as const;

/**
 * `IMG_4821 (1).jpeg` → `IMG 4821` — a readable starting point, so a library
 * never fills up with "Untitled".
 */
export function titleFromFilename(filename: string) {
  const withoutExtension = filename.replace(/\.[a-z0-9]+$/i, '');
  const cleaned = withoutExtension
    .replace(/[-_]+/g, ' ')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
