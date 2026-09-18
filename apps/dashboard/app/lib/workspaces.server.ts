import type { Workspace } from './workspaces';

/**
 * Workspace reads and writes. D1 has no interactive transactions, so anything
 * that must land together goes through `db.batch()`, which commits atomically.
 */

type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  kind: 'personal' | 'brand';
  avatar_key?: string | null;
};

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    avatarAssetId: row.avatar_key ?? undefined,
  };
}

/** Every workspace this user is a member of, most recently joined last. */
export async function listWorkspaces(db: D1Database, userId: string): Promise<Workspace[]> {
  const { results } = await db
    .prepare(
      `SELECT w.id, w.slug, w.name, w.kind, p.avatar_key
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
         LEFT JOIN profiles p ON p.workspace_id = w.id
        WHERE m.user_id = ?1
        ORDER BY w.kind = 'personal' DESC, w.created_at ASC`,
    )
    .bind(userId)
    .all<WorkspaceRow>();

  return (results ?? []).map(toWorkspace);
}

/** A URL-safe slug. Uniqueness is enforced by the database, not by this. */
export function toSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'me'
  );
}

async function slugTaken(db: D1Database, slug: string) {
  const row = await db.prepare('SELECT 1 FROM workspaces WHERE slug = ?1').bind(slug).first();
  return row !== null;
}

/**
 * Finds a free slug near the one asked for: `evans`, then `evans-2`, `evans-3`.
 * The unique index is still the authority — a caller that loses a race retries.
 */
async function reserveSlug(db: D1Database, preferred: string) {
  const base = toSlug(preferred);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await slugTaken(db, candidate))) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * Creates a workspace: the workspace itself, its owner, and the canonical
 * profile it exists to hold. One batch, so a half-made workspace can never be
 * left behind.
 */
export async function createWorkspace(
  db: D1Database,
  input: { userId: string; preferredSlug: string; name: string; kind: 'personal' | 'brand' },
): Promise<Workspace> {
  const slug = await reserveSlug(db, input.preferredSlug);
  const workspaceId = crypto.randomUUID();

  await db.batch([
    db
      .prepare('INSERT INTO workspaces (id, slug, name, kind) VALUES (?1, ?2, ?3, ?4)')
      .bind(workspaceId, slug, input.name, input.kind),
    db
      .prepare(
        'INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?1, ?2, ?3, ?4)',
      )
      .bind(crypto.randomUUID(), workspaceId, input.userId, 'owner'),
    db
      .prepare('INSERT INTO profiles (id, workspace_id, display_name) VALUES (?1, ?2, ?3)')
      .bind(crypto.randomUUID(), workspaceId, input.name),
  ]);

  return { id: workspaceId, slug, name: input.name, kind: input.kind };
}

/**
 * What every signed-in request needs: the workspaces this user can reach,
 * creating their personal one on first sight. A slug collision from a
 * simultaneous first request is retried once by re-reading.
 */
export async function ensureWorkspaces(
  db: D1Database,
  user: { userId: string; preferredSlug: string; name: string },
): Promise<Workspace[]> {
  const existing = await listWorkspaces(db, user.userId);
  if (existing.length) return existing;

  try {
    const created = await createWorkspace(db, { ...user, kind: 'personal' });
    return [created];
  } catch {
    return listWorkspaces(db, user.userId);
  }
}

/** The workspace behind a slug, only if this user is a member of it. */
export async function getWorkspaceForUser(
  db: D1Database,
  userId: string,
  slug: string,
): Promise<Workspace | null> {
  const row = await db
    .prepare(
      `SELECT w.id, w.slug, w.name, w.kind, p.avatar_key
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
         LEFT JOIN profiles p ON p.workspace_id = w.id
        WHERE m.user_id = ?1 AND w.slug = ?2`,
    )
    .bind(userId, slug)
    .first<WorkspaceRow>();

  return row ? toWorkspace(row) : null;
}

export type WorkspaceOverview = {
  profile: { displayName: string; hasBio: boolean; hasAvatar: boolean } | null;
  links: number;
  connections: number;
  lastSyncAt: string | null;
};

/** Everything the overview reports, for one workspace. */
export async function readOverview(
  db: D1Database,
  workspaceId: string,
): Promise<WorkspaceOverview> {
  const profile = await db
    .prepare('SELECT id, display_name, short_bio, avatar_key FROM profiles WHERE workspace_id = ?1')
    .bind(workspaceId)
    .first<{
      id: string;
      display_name: string;
      short_bio: string | null;
      avatar_key: string | null;
    }>();

  if (!profile) return { profile: null, links: 0, connections: 0, lastSyncAt: null };

  const [links, connections, lastSync] = await Promise.all([
    db
      .prepare('SELECT count(*) AS n FROM profile_links WHERE profile_id = ?1 AND is_active = 1')
      .bind(profile.id)
      .first<{ n: number }>(),
    db
      .prepare(
        "SELECT count(*) AS n FROM connected_accounts WHERE profile_id = ?1 AND connection_status = 'connected'",
      )
      .bind(profile.id)
      .first<{ n: number }>(),
    db
      .prepare(
        "SELECT completed_at FROM sync_jobs WHERE profile_id = ?1 AND status = 'succeeded' ORDER BY completed_at DESC LIMIT 1",
      )
      .bind(profile.id)
      .first<{ completed_at: string | null }>(),
  ]);

  return {
    profile: {
      displayName: profile.display_name,
      hasBio: Boolean(profile.short_bio),
      hasAvatar: Boolean(profile.avatar_key),
    },
    links: links?.n ?? 0,
    connections: connections?.n ?? 0,
    lastSyncAt: lastSync?.completed_at ?? null,
  };
}

/**
 * Deletes a brand and everything scoped to it — profile, links, connections and
 * sync history all cascade. A personal workspace is never deletable: it is the
 * account's own identity, and removing it would orphan the account.
 */
export async function deleteBrand(
  db: D1Database,
  userId: string,
  slug: string,
): Promise<{ error: string | null }> {
  const row = await db
    .prepare(
      `SELECT w.id, w.kind, m.role
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = ?1 AND w.slug = ?2`,
    )
    .bind(userId, slug)
    .first<{ id: string; kind: 'personal' | 'brand'; role: string }>();

  if (!row) return { error: 'That brand does not exist, or you cannot reach it.' };
  if (row.kind === 'personal') return { error: 'Your personal workspace cannot be deleted.' };
  if (row.role !== 'owner') return { error: 'Only an owner can delete a brand.' };

  await db.prepare('DELETE FROM workspaces WHERE id = ?1').bind(row.id).run();

  return { error: null };
}
