import { parseScopes, type Scope } from './scopes';

/**
 * API key issuance and verification.
 *
 * Keys are stored as a SHA-256 hash, never in a form that could be replayed —
 * a leaked database row yields nothing usable. That is also why a key is shown
 * exactly once: there is nothing to show it from afterwards.
 *
 * Hashing is unsalted and uncached on purpose. A key is 32 bytes of entropy
 * rather than a password, so there is nothing to brute-force, and a plain hash
 * keeps verification to one indexed read.
 */

const PREFIX = 'olk_live_';

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: Scope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedRegion: string | null;
  revokedAt: string | null;
};

export type VerifiedKey = {
  id: string;
  workspaceId: string;
  scopes: Scope[];
};

async function hash(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createApiKey(
  db: D1Database,
  input: {
    workspaceId: string;
    userId: string;
    name: string;
    scopes: string[];
    expiresInDays?: number | null;
  },
) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: 'Give the key a name you will recognise.' };

  const scopes = parseScopes(input.scopes);
  if (!scopes.length) {
    return { ok: false as const, error: 'Choose at least one thing this key may read.' };
  }

  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const body = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const key = `${PREFIX}${body}`;

  await db
    .prepare(
      `INSERT INTO api_keys
         (id, workspace_id, name, key_hash, key_prefix, scopes_json,
          created_by_user_id, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      crypto.randomUUID(),
      input.workspaceId,
      name,
      await hash(key),
      key.slice(0, PREFIX.length + 4),
      JSON.stringify(scopes),
      input.userId,
      input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
        : null,
    )
    .run();

  return { ok: true as const, key, message: 'Key created' };
}

export async function listApiKeys(db: D1Database, workspaceId: string): Promise<ApiKey[]> {
  const rows = await db
    .prepare(
      `SELECT id, name, key_prefix, scopes_json, created_at, expires_at,
              last_used_at, last_used_region, revoked_at
         FROM api_keys WHERE workspace_id = ?1
        ORDER BY revoked_at IS NOT NULL, created_at DESC`,
    )
    .bind(workspaceId)
    .all<Record<string, string | null>>();

  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    keyPrefix: String(row.key_prefix),
    scopes: JSON.parse(String(row.scopes_json)) as Scope[],
    createdAt: String(row.created_at),
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    lastUsedRegion: row.last_used_region,
    revokedAt: row.revoked_at,
  }));
}

export async function revokeApiKey(db: D1Database, workspaceId: string, keyId: string) {
  // Revoked rather than deleted: the row is the only record that the key ever
  // existed, and "when was this revoked" is a question worth being able to answer.
  await db
    .prepare(
      `UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP
        WHERE id = ?1 AND workspace_id = ?2 AND revoked_at IS NULL`,
    )
    .bind(keyId, workspaceId)
    .run();
  return { ok: true as const, message: 'Key revoked. It stops working immediately.' };
}

export type AuthFailure = 'missing' | 'unknown' | 'revoked' | 'expired' | 'forbidden';

/**
 * Verifies the bearer token on a request and checks it carries `required`.
 *
 * `last_used_at` is recorded so an unused key is visible as unused, alongside a
 * coarse region. No IP address is stored — knowing a key was last used from
 * Ghana is enough to notice something wrong; keeping addresses is not.
 */
export async function authenticateRequest(
  env: Env,
  request: Request,
  required: Scope,
): Promise<{ ok: true; key: VerifiedKey } | { ok: false; reason: AuthFailure }> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return { ok: false, reason: 'missing' };

  const row = await env.DB.prepare(
    `SELECT id, workspace_id, scopes_json, expires_at, revoked_at
       FROM api_keys WHERE key_hash = ?1`,
  )
    .bind(await hash(token))
    .first<{
      id: string;
      workspace_id: string;
      scopes_json: string;
      expires_at: string | null;
      revoked_at: string | null;
    }>();

  if (!row) return { ok: false, reason: 'unknown' };
  if (row.revoked_at) return { ok: false, reason: 'revoked' };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const scopes = JSON.parse(row.scopes_json) as Scope[];
  if (!scopes.includes(required)) return { ok: false, reason: 'forbidden' };

  const region = request.headers.get('CF-IPCountry');
  await env.DB.prepare(
    `UPDATE api_keys
        SET last_used_at = CURRENT_TIMESTAMP,
            last_used_region = coalesce(?2, last_used_region)
      WHERE id = ?1`,
  )
    .bind(row.id, region && /^[A-Z]{2}$/.test(region) ? region : null)
    .run();

  return { ok: true, key: { id: row.id, workspaceId: row.workspace_id, scopes } };
}
