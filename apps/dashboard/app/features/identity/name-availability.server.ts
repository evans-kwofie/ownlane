/** Separator variants represent the same public identity. */
export function canonicalHandleKey(value: string) {
  return value.trim().toLowerCase().replace(/[._-]/g, '');
}

const RESERVED = new Set([
  'about',
  'admin',
  'api',
  'app',
  'assets',
  'blog',
  'careers',
  'contact',
  'continue',
  'dashboard',
  'developer',
  'docs',
  'embed',
  'events',
  'help',
  'home',
  'legal',
  'login',
  'mcp',
  'nameavailability',
  'notifications',
  'oauth',
  'ownlane',
  'pricing',
  'privacy',
  'r',
  'root',
  'settings',
  'signup',
  'start',
  'status',
  'support',
  'swjs',
  'system',
  'terms',
  'www',
  'v0',
]);

export function isReservedHandle(value: string) {
  return RESERVED.has(canonicalHandleKey(value));
}

/** A preview only. Workspace creation rechecks and the database is authoritative. */
export async function isNameAvailable(db: D1Database, raw: string) {
  const handle = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,28}[a-z0-9]$/.test(handle)) {
    return { valid: false, free: false };
  }

  const key = canonicalHandleKey(handle);
  if (isReservedHandle(key)) return { valid: true, free: false };

  const [active, retired] = await Promise.all([
    db.prepare(`SELECT 1 FROM workspaces WHERE slug_key = ?1`).bind(key).first(),
    db
      .prepare(
        `SELECT 1 FROM workspace_slug_history
          WHERE replace(replace(replace(lower(slug), '.', ''), '_', ''), '-', '') = ?1`,
      )
      .bind(key)
      .first(),
  ]);

  return { valid: true, free: !active && !retired };
}
