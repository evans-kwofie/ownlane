import {
  CONTACT_CHANNELS,
  isChoiceField,
  isTextField,
  type ContactChannel,
  type CredibilityEntry,
  type CredibilityKind,
  type Profile,
  type ProfileField,
  type ProfileVersion,
  type ScheduledChange,
  type ServiceEntry,
} from './profiles';

/**
 * Everything the profile module reads and writes. D1 has no interactive
 * transactions, so anything that must land together goes through `batch()`.
 */

/** Editable single-value fields, mapped to their columns. */
const COLUMNS: Record<ProfileField, string> = {
  displayName: 'display_name',
  handle: 'handle',
  pronunciation: 'pronunciation',
  pronouns: 'pronouns',
  profession: 'profession',
  shortBio: 'short_bio',
  mediumBio: 'medium_bio',
  longBio: 'long_bio',
  categories: 'categories',
  skills: 'skills',
  languages: 'languages',
  publicEmail: 'public_email',
  phone: 'phone',
  whatsapp: 'whatsapp',
  bookingUrl: 'booking_url',
  websiteUrl: 'website_url',
  city: 'city',
  country: 'country',
  serviceArea: 'service_area',
  location: 'location',
  timezone: 'timezone',
  creatorType: 'creator_type',
  preferredContact: 'preferred_contact',
  remoteAvailability: 'remote_availability',
  availabilityStatus: 'availability_status',
  visibility: 'visibility',
};

const FIELDS = Object.keys(COLUMNS) as ProfileField[];

export type ProfileBundle = {
  profile: Profile;
  contactVisibility: Record<ContactChannel, 'public' | 'private'>;
  credibility: CredibilityEntry[];
  services: ServiceEntry[];
  fieldSources: Record<string, string>;
  versions: ProfileVersion[];
  scheduled: ScheduledChange[];
};

function rowToProfile(row: Record<string, unknown>): Profile {
  const profile = {
    id: String(row.id),
    avatarKey: (row.avatar_key as string) ?? '',
    coverKey: (row.cover_key as string) ?? '',
    logoKey: (row.logo_key as string) ?? '',
  } as Profile;

  for (const field of FIELDS) {
    (profile as Record<string, string>)[field] = (row[field] as string) ?? '';
  }

  return profile;
}

export async function readProfile(db: D1Database, workspaceId: string): Promise<Profile | null> {
  const selection = FIELDS.map((field) => `${COLUMNS[field]} AS ${field}`).join(', ');

  const row = await db
    .prepare(
      `SELECT id, avatar_key, cover_key, logo_key, ${selection} FROM profiles WHERE workspace_id = ?1`,
    )
    .bind(workspaceId)
    .first<Record<string, unknown>>();

  return row ? rowToProfile(row) : null;
}

/** The profile and everything hanging off it, in one round of queries. */
export async function readProfileBundle(
  db: D1Database,
  workspaceId: string,
): Promise<ProfileBundle | null> {
  const profile = await readProfile(db, workspaceId);
  if (!profile) return null;

  const [visibility, credibility, services, sources, versions, scheduled] = await Promise.all([
    db
      .prepare('SELECT channel, visibility FROM profile_contact_visibility WHERE profile_id = ?1')
      .bind(profile.id)
      .all<{ channel: ContactChannel; visibility: 'public' | 'private' }>(),
    db
      .prepare(
        'SELECT id, kind, label, url, issuer FROM profile_credibility WHERE profile_id = ?1 ORDER BY kind, position, created_at',
      )
      .bind(profile.id)
      .all<{
        id: string;
        kind: CredibilityKind;
        label: string;
        url: string | null;
        issuer: string | null;
      }>(),
    db
      .prepare(
        'SELECT id, name, description, url FROM profile_services WHERE profile_id = ?1 ORDER BY position, created_at',
      )
      .bind(profile.id)
      .all<{ id: string; name: string; description: string | null; url: string | null }>(),
    db
      .prepare('SELECT field, source FROM profile_field_sources WHERE profile_id = ?1')
      .bind(profile.id)
      .all<{ field: string; source: string }>(),
    db
      .prepare(
        'SELECT id, created_at, changed_fields_json, label FROM profile_versions WHERE profile_id = ?1 ORDER BY created_at DESC LIMIT 20',
      )
      .bind(profile.id)
      .all<{ id: string; created_at: string; changed_fields_json: string; label: string | null }>(),
    db
      .prepare(
        `SELECT id, apply_at, status, changes_json, error_message
           FROM profile_scheduled_changes
          WHERE profile_id = ?1 AND status = 'pending'
          ORDER BY apply_at`,
      )
      .bind(profile.id)
      .all<{
        id: string;
        apply_at: string;
        status: ScheduledChange['status'];
        changes_json: string;
        error_message: string | null;
      }>(),
  ]);

  const contactVisibility = Object.fromEntries(
    CONTACT_CHANNELS.map((channel) => [channel, 'private' as const]),
  ) as Record<ContactChannel, 'public' | 'private'>;

  for (const row of visibility.results ?? []) contactVisibility[row.channel] = row.visibility;

  return {
    profile,
    contactVisibility,
    credibility: (credibility.results ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      url: row.url ?? '',
      issuer: row.issuer ?? '',
    })),
    services: (services.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      url: row.url ?? '',
    })),
    fieldSources: Object.fromEntries((sources.results ?? []).map((row) => [row.field, row.source])),
    versions: (versions.results ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      changedFields: safeParse<ProfileField[]>(row.changed_fields_json, []),
      label: row.label ?? '',
    })),
    scheduled: (scheduled.results ?? []).map((row) => ({
      id: row.id,
      applyAt: row.apply_at,
      status: row.status,
      changes: safeParse<Partial<Record<ProfileField, string>>>(row.changes_json, {}),
      errorMessage: row.error_message ?? '',
    })),
  };
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Keeps history bounded; the oldest fall away once the cap is passed. */
const VERSIONS_KEPT = 50;

/**
 * Writes the changed fields and records what the profile looked like before,
 * so any save can be undone. The snapshot is the prior state — restoring it is
 * itself a save, and gets its own version.
 */
export async function updateProfile(
  db: D1Database,
  workspaceId: string,
  changes: Partial<Record<ProfileField, string>>,
  meta: { userId?: string; label?: string } = {},
): Promise<void> {
  const entries = (Object.entries(changes) as [ProfileField, string][]).filter(
    ([field]) => isTextField(field) || isChoiceField(field),
  );
  if (!entries.length) return;

  const before = await readProfile(db, workspaceId);
  if (!before) return;

  const assignments = entries
    .map(([field], index) => `${COLUMNS[field]} = ?${index + 1}`)
    .join(', ');
  const values = entries.map(([, value]) => value);

  await db.batch([
    db
      .prepare(
        `UPDATE profiles SET ${assignments}, updated_at = CURRENT_TIMESTAMP
          WHERE workspace_id = ?${values.length + 1}`,
      )
      .bind(...values, workspaceId),
    db
      .prepare(
        `INSERT INTO profile_versions (id, profile_id, snapshot_json, changed_fields_json, created_by, label)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        before.id,
        JSON.stringify(before),
        JSON.stringify(entries.map(([field]) => field)),
        meta.userId ?? null,
        meta.label ?? null,
      ),
    db
      .prepare(
        `DELETE FROM profile_versions
          WHERE profile_id = ?1
            AND id NOT IN (
              SELECT id FROM profile_versions WHERE profile_id = ?1 ORDER BY created_at DESC LIMIT ${VERSIONS_KEPT}
            )`,
      )
      .bind(before.id),
  ]);
}

/** Puts the profile back to a stored snapshot, as a new save. */
export async function restoreVersion(
  db: D1Database,
  workspaceId: string,
  versionId: string,
  userId?: string,
): Promise<{ error: string | null }> {
  const row = await db
    .prepare(
      `SELECT v.snapshot_json FROM profile_versions v
         JOIN profiles p ON p.id = v.profile_id
        WHERE v.id = ?1 AND p.workspace_id = ?2`,
    )
    .bind(versionId, workspaceId)
    .first<{ snapshot_json: string }>();

  if (!row) return { error: 'That version no longer exists.' };

  const snapshot = safeParse<Record<string, string>>(row.snapshot_json, {});
  const changes: Partial<Record<ProfileField, string>> = {};

  for (const field of FIELDS) {
    if (typeof snapshot[field] === 'string') changes[field] = snapshot[field];
  }

  await updateProfile(db, workspaceId, changes, { userId, label: 'Restored an earlier version' });

  return { error: null };
}

export async function setContactVisibility(
  db: D1Database,
  profileId: string,
  channel: ContactChannel,
  visibility: 'public' | 'private',
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profile_contact_visibility (profile_id, channel, visibility) VALUES (?1, ?2, ?3)
       ON CONFLICT (profile_id, channel) DO UPDATE SET visibility = excluded.visibility`,
    )
    .bind(profileId, channel, visibility)
    .run();
}

export async function setFieldSource(
  db: D1Database,
  profileId: string,
  field: string,
  source: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profile_field_sources (profile_id, field, source) VALUES (?1, ?2, ?3)
       ON CONFLICT (profile_id, field) DO UPDATE SET source = excluded.source`,
    )
    .bind(profileId, field, source)
    .run();
}

export async function addCredibility(
  db: D1Database,
  profileId: string,
  entry: { kind: CredibilityKind; label: string; url: string; issuer: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profile_credibility (id, profile_id, kind, label, url, issuer, position)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, (SELECT COALESCE(MAX(position), 0) + 1 FROM profile_credibility WHERE profile_id = ?2))`,
    )
    .bind(
      crypto.randomUUID(),
      profileId,
      entry.kind,
      entry.label,
      entry.url || null,
      entry.issuer || null,
    )
    .run();
}

export async function addService(
  db: D1Database,
  profileId: string,
  entry: { name: string; description: string; url: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profile_services (id, profile_id, name, description, url, position)
       VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MAX(position), 0) + 1 FROM profile_services WHERE profile_id = ?2))`,
    )
    .bind(crypto.randomUUID(), profileId, entry.name, entry.description || null, entry.url || null)
    .run();
}

export async function removeRow(
  db: D1Database,
  table: 'profile_credibility' | 'profile_services',
  profileId: string,
  id: string,
): Promise<void> {
  await db
    .prepare(`DELETE FROM ${table} WHERE id = ?1 AND profile_id = ?2`)
    .bind(id, profileId)
    .run();
}

/** Queues a change for a date, remembering today's values to detect edits. */
export async function scheduleChange(
  db: D1Database,
  profile: Profile,
  input: {
    changes: Partial<Record<ProfileField, string>>;
    applyAt: string;
    conflictStrategy: 'overwrite' | 'skip_edited';
    userId?: string;
  },
): Promise<void> {
  const baseline = Object.fromEntries(
    Object.keys(input.changes).map((field) => [
      field,
      (profile as Record<string, string>)[field] ?? '',
    ]),
  );

  await db
    .prepare(
      `INSERT INTO profile_scheduled_changes
         (id, profile_id, changes_json, apply_at, conflict_strategy, baseline_json, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      crypto.randomUUID(),
      profile.id,
      JSON.stringify(input.changes),
      input.applyAt,
      input.conflictStrategy,
      JSON.stringify(baseline),
      input.userId ?? null,
    )
    .run();
}

export async function cancelScheduledChange(
  db: D1Database,
  profileId: string,
  id: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE profile_scheduled_changes SET status = 'cancelled' WHERE id = ?1 AND profile_id = ?2`,
    )
    .bind(id, profileId)
    .run();
}

/**
 * Applies everything due. Called by the Worker's cron trigger, so a scheduled
 * change happens whether or not anyone has the app open.
 */
export async function applyDueChanges(
  db: D1Database,
  now = new Date(),
): Promise<{ applied: number; failed: number }> {
  const due = await db
    .prepare(
      `SELECT s.id, s.profile_id, s.changes_json, s.conflict_strategy, s.baseline_json, p.workspace_id
         FROM profile_scheduled_changes s
         JOIN profiles p ON p.id = s.profile_id
        WHERE s.status = 'pending' AND s.apply_at <= ?1
        LIMIT 50`,
    )
    .bind(now.toISOString())
    .all<{
      id: string;
      profile_id: string;
      changes_json: string;
      conflict_strategy: 'overwrite' | 'skip_edited';
      baseline_json: string;
      workspace_id: string;
    }>();

  let applied = 0;
  let failed = 0;

  for (const row of due.results ?? []) {
    try {
      const changes = safeParse<Partial<Record<ProfileField, string>>>(row.changes_json, {});
      const baseline = safeParse<Record<string, string>>(row.baseline_json, {});
      const current = await readProfile(db, row.workspace_id);
      if (!current) throw new Error('The profile no longer exists.');

      const toApply: Partial<Record<ProfileField, string>> = {};

      for (const [field, value] of Object.entries(changes) as [ProfileField, string][]) {
        const editedSince = (current as Record<string, string>)[field] !== (baseline[field] ?? '');
        if (row.conflict_strategy === 'skip_edited' && editedSince) continue;
        toApply[field] = value;
      }

      if (Object.keys(toApply).length) {
        await updateProfile(db, row.workspace_id, toApply, { label: 'Scheduled change' });
      }

      await db
        .prepare(
          `UPDATE profile_scheduled_changes SET status = 'applied', applied_at = ?2 WHERE id = ?1`,
        )
        .bind(row.id, now.toISOString())
        .run();

      applied += 1;
    } catch (error) {
      failed += 1;
      await db
        .prepare(
          `UPDATE profile_scheduled_changes SET status = 'failed', error_message = ?2 WHERE id = ?1`,
        )
        .bind(row.id, error instanceof Error ? error.message : 'Unknown error')
        .run();
    }
  }

  return { applied, failed };
}

export type PublicProfile = {
  workspaceId: string;
  slug: string;
  visibility: 'public' | 'private';
  profile: Profile;
  contact: { channel: ContactChannel; value: string }[];
  credibility: CredibilityEntry[];
  services: ServiceEntry[];
  links: {
    id: string;
    label: string;
    url: string;
    thumbnailAssetId: string | null;
    platformKey: string | null;
    collectionId: string | null;
    collectionTitle: string | null;
    collectionDescription: string | null;
    collectionLayout: 'list' | 'grid' | 'compact' | null;
    collectionPosition: number | null;
  }[];
};

/**
 * A profile as the world sees it, addressed by slug rather than by membership.
 * Contact details appear only where they were explicitly published, and the
 * caller decides what to do about a private profile.
 */
export async function readPublicProfile(
  db: D1Database,
  slug: string,
): Promise<PublicProfile | null> {
  const row = await db
    .prepare('SELECT id, slug FROM workspaces WHERE slug = ?1')
    .bind(slug)
    .first<{ id: string; slug: string }>();

  if (!row) return null;

  const profile = await readProfile(db, row.id);
  if (!profile) return null;

  const [visibility, credibility, services, links] = await Promise.all([
    db
      .prepare(
        "SELECT channel FROM profile_contact_visibility WHERE profile_id = ?1 AND visibility = 'public'",
      )
      .bind(profile.id)
      .all<{ channel: ContactChannel }>(),
    db
      .prepare(
        'SELECT id, kind, label, url, issuer FROM profile_credibility WHERE profile_id = ?1 ORDER BY kind, position',
      )
      .bind(profile.id)
      .all<{
        id: string;
        kind: CredibilityKind;
        label: string;
        url: string | null;
        issuer: string | null;
      }>(),
    db
      .prepare(
        'SELECT id, name, description, url FROM profile_services WHERE profile_id = ?1 ORDER BY position',
      )
      .bind(profile.id)
      .all<{ id: string; name: string; description: string | null; url: string | null }>(),
    db
      .prepare(
        `SELECT l.id, l.label, l.url, l.thumbnail_asset_id AS thumbnailAssetId,
                l.platform_key AS platformKey,
                l.collection_id AS collectionId, c.title AS collectionTitle,
                c.description AS collectionDescription, c.layout AS collectionLayout,
                c.position AS collectionPosition
           FROM profile_links l
           LEFT JOIN link_collections c ON c.id = l.collection_id
          WHERE l.profile_id = ?1 AND l.is_active = 1
            AND (l.collection_id IS NULL OR c.is_active = 1)
            AND (l.publication_status = 'live'
              OR (l.publication_status = 'scheduled' AND datetime(l.starts_at) <= CURRENT_TIMESTAMP
                  AND (l.ends_at IS NULL OR datetime(l.ends_at) > CURRENT_TIMESTAMP)))
          ORDER BY CASE WHEN l.collection_id IS NULL THEN 0 ELSE 1 END,
                   c.position, l.position, l.created_at`,
      )
      .bind(profile.id)
      .all<{
        id: string;
        label: string;
        url: string;
        thumbnailAssetId: string | null;
        platformKey: string | null;
        collectionId: string | null;
        collectionTitle: string | null;
        collectionDescription: string | null;
        collectionLayout: 'list' | 'grid' | 'compact' | null;
        collectionPosition: number | null;
      }>(),
  ]);

  const published = new Set((visibility.results ?? []).map((entry) => entry.channel));

  return {
    workspaceId: row.id,
    slug: row.slug,
    visibility: profile.visibility === 'public' ? 'public' : 'private',
    profile,
    contact: CONTACT_CHANNELS.filter((channel) => published.has(channel) && profile[channel]).map(
      (channel) => ({ channel, value: profile[channel] }),
    ),
    credibility: (credibility.results ?? []).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      url: entry.url ?? '',
      issuer: entry.issuer ?? '',
    })),
    services: (services.results ?? []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description ?? '',
      url: entry.url ?? '',
    })),
    links: links.results ?? [],
  };
}

/** Whether this viewer may preview a profile that is not published yet. */
export async function canPreview(
  db: D1Database,
  workspaceId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;

  const row = await db
    .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ?1 AND user_id = ?2')
    .bind(workspaceId, userId)
    .first();

  return row !== null;
}
