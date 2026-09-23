import { toSlug, type Workspace } from './workspaces';

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
/**
 * A slug is taken if any workspace uses it now, or if any workspace used to.
 * Releasing a retired address for reuse would silently redirect somebody's old
 * links into a stranger's workspace.
 */
async function slugTaken(db: D1Database, slug: string, exceptWorkspaceId?: string) {
  const row = await db
    .prepare(
      `SELECT 1 FROM workspaces WHERE slug = ?1 AND (?2 IS NULL OR id <> ?2)
       UNION ALL
       SELECT 1 FROM workspace_slug_history
        WHERE slug = ?1 AND (?2 IS NULL OR workspace_id <> ?2)`,
    )
    .bind(slug, exceptWorkspaceId ?? null)
    .first();
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

/**
 * The workspace a retired slug used to name, if the person can still reach it.
 * Callers redirect to its current address rather than rendering here, so an old
 * link resolves once and then stops being old.
 */
export async function resolveRetiredSlug(db: D1Database, userId: string, slug: string) {
  const row = await db
    .prepare(
      `SELECT w.slug
         FROM workspace_slug_history h
         JOIN workspaces w ON w.id = h.workspace_id
         JOIN workspace_members m ON m.workspace_id = w.id
        WHERE h.slug = ?1 AND m.user_id = ?2`,
    )
    .bind(slug, userId)
    .first<{ slug: string }>();
  return row?.slug ?? null;
}

export type RenameResult =
  { ok: true; slug: string } | { ok: false; field: 'name' | 'slug'; error: string };

/** Renames a workspace, keeping its old address working. */
export async function renameWorkspace(
  db: D1Database,
  workspaceId: string,
  input: { name: string; slug: string },
): Promise<RenameResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, field: 'name', error: 'Give this workspace a name.' };
  if (name.length > 60)
    return { ok: false, field: 'name', error: 'Keep the name under 60 characters.' };

  const slug = toSlug(input.slug);
  if (!slug || slug.length < 2) {
    return { ok: false, field: 'slug', error: 'An address needs at least two characters.' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, field: 'slug', error: 'That address is reserved.' };
  }

  const current = await db
    .prepare('SELECT slug FROM workspaces WHERE id = ?1')
    .bind(workspaceId)
    .first<{ slug: string }>();
  if (!current) return { ok: false, field: 'name', error: 'That workspace no longer exists.' };

  if (slug !== current.slug && (await slugTaken(db, slug, workspaceId))) {
    return { ok: false, field: 'slug', error: 'That address is already in use.' };
  }

  const statements = [
    db
      .prepare(
        'UPDATE workspaces SET name = ?2, slug = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?1',
      )
      .bind(workspaceId, name, slug),
  ];
  if (slug !== current.slug) {
    statements.push(
      db
        .prepare(
          `INSERT INTO workspace_slug_history (slug, workspace_id) VALUES (?1, ?2)
           ON CONFLICT(slug) DO NOTHING`,
        )
        .bind(current.slug, workspaceId),
    );
  }
  await db.batch(statements);

  return { ok: true, slug };
}

/** Addresses that would collide with the app's own routes. */
const RESERVED_SLUGS = new Set([
  'app',
  'account',
  'brands',
  'assets',
  'contact',
  'events',
  'oauth',
  'notifications',
  'continue',
  'r',
  'sw.js',
]);

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
