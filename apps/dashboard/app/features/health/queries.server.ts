/**
 * Everything the checks need, read in one pass.
 *
 * Gathering is separated from judging so that `runHealthChecks` is a pure
 * function of this shape — it can be reasoned about, and tested, without a
 * database.
 */

export type ConnectionSignal = {
  provider: string;
  displayName: string | null;
  providerHandle: string | null;
  connectionStatus: string;
  tokenHealth: string;
  tokenExpiresAt: string | null;
  lastErrorCode: string | null;
  lastSyncedAt: string | null;
  /** When the provider was last read back. Null means never verified. */
  identityCheckedAt: string | null;
  /** Last write to the row, which dates `lastErrorCode`. */
  updatedAt: string | null;
};

export type HealthSignals = {
  profile: {
    displayName: string;
    handle: string;
    shortBio: string;
    mediumBio: string;
    longBio: string;
    avatarKey: string;
    coverKey: string;
    logoKey: string;
    profession: string;
    categories: string;
    skills: string;
    location: string;
    timezone: string;
    pronunciation: string;
    websiteUrl: string;
    visibility: string;
  };
  contact: {
    publicChannels: number;
    formEnabled: boolean;
    notifyOwner: boolean;
    notifyEmail: string | null;
  };
  connections: ConnectionSignal[];
  links: {
    total: number;
    active: number;
    expired: Array<{ label: string; endsAt: string }>;
    duplicateUrls: number;
    withoutClicks: string[];
    broken: Array<{ label: string; reason: string }>;
    redirected: Array<{ label: string; to: string }>;
    /** Active links with no verdict yet, so the check knows what it has not seen. */
    unchecked: number;
  };
  handles: {
    /** Handles resolving to an account that is not the connected one. */
    taken: string[];
    /** Platforms where the handle is still free to claim. */
    available: string[];
    checked: number;
  };
  content: { featured: number; newestFeaturedAt: string | null };
  leads: {
    total: number;
    unanswered: number;
    unansweredOverAWeek: number;
    oldestUnansweredAt: string | null;
  };
};

export async function readHealthSignals(db: D1Database, profileId: string): Promise<HealthSignals> {
  const [
    profile,
    visibility,
    form,
    connections,
    links,
    expired,
    dupes,
    quiet,
    linkStates,
    unchecked,
    handles,
    content,
    leads,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT display_name, handle, short_bio, medium_bio, long_bio, avatar_key, cover_key,
                  logo_key, profession, categories, skills, location, timezone, pronunciation,
                  website_url, visibility
             FROM profiles WHERE id = ?1`,
      )
      .bind(profileId)
      .first<Record<string, string | null>>(),
    db
      .prepare(
        `SELECT count(*) AS total FROM profile_contact_visibility
            WHERE profile_id = ?1 AND visibility = 'public'`,
      )
      .bind(profileId)
      .first<{ total: number }>(),
    db
      .prepare(
        `SELECT is_enabled, notify_owner, notify_email
             FROM profile_contact_form WHERE profile_id = ?1`,
      )
      .bind(profileId)
      .first<{ is_enabled: number; notify_owner: number; notify_email: string | null }>(),
    db
      .prepare(
        `SELECT provider, display_name, provider_handle, connection_status, token_health,
                  token_expires_at, last_error_code, last_synced_at, identity_checked_at,
                  updated_at
             FROM connected_accounts WHERE profile_id = ?1`,
      )
      .bind(profileId)
      .all<Record<string, string | null>>(),
    db
      .prepare(
        `SELECT count(*) AS total,
                  count(CASE WHEN is_active = 1 THEN 1 END) AS active
             FROM profile_links WHERE profile_id = ?1`,
      )
      .bind(profileId)
      .first<{ total: number; active: number }>(),
    db
      .prepare(
        `SELECT label, ends_at FROM profile_links
            WHERE profile_id = ?1 AND ends_at IS NOT NULL AND ends_at < CURRENT_TIMESTAMP
            ORDER BY ends_at DESC LIMIT 5`,
      )
      .bind(profileId)
      .all<{ label: string; ends_at: string }>(),
    db
      .prepare(
        `SELECT count(*) AS total FROM (
             SELECT url FROM profile_links WHERE profile_id = ?1
              GROUP BY url HAVING count(*) > 1)`,
      )
      .bind(profileId)
      .first<{ total: number }>(),
    // Active links that nobody opened in the last 30 days. Only meaningful
    // once the profile has traffic at all, which the check itself guards.
    db
      .prepare(
        `SELECT l.label
             FROM profile_links l
            WHERE l.profile_id = ?1 AND l.is_active = 1
              AND NOT EXISTS (
                SELECT 1 FROM analytics_events e
                 WHERE e.destination_id = l.id AND e.event_type = 'outbound_click'
                   AND e.occurred_at > datetime('now', '-30 days'))
            ORDER BY l.position LIMIT 5`,
      )
      .bind(profileId)
      .all<{ label: string }>(),
    db
      .prepare(
        `SELECT l.label, h.state, h.status_code, h.redirect_url, h.error
             FROM profile_links l
             JOIN link_health h ON h.link_id = l.id
            WHERE l.profile_id = ?1 AND l.is_active = 1
              AND h.state IN ('broken', 'redirected')
            ORDER BY l.position LIMIT 10`,
      )
      .bind(profileId)
      .all<{
        label: string;
        state: string;
        status_code: number | null;
        redirect_url: string | null;
        error: string | null;
      }>(),
    db
      .prepare(
        `SELECT count(*) AS total
             FROM profile_links l
             LEFT JOIN link_health h ON h.link_id = l.id
            WHERE l.profile_id = ?1 AND l.is_active = 1
              AND (h.last_checked_at IS NULL)`,
      )
      .bind(profileId)
      .first<{ total: number }>(),
    db
      .prepare(
        `SELECT provider, state FROM handle_coverage
          WHERE profile_id = ?1 AND state IN ('taken', 'available')
          ORDER BY provider`,
      )
      .bind(profileId)
      .all<{ provider: string; state: string }>(),
    db
      .prepare(
        `SELECT count(*) AS featured, max(published_at) AS newest
             FROM content_items WHERE profile_id = ?1 AND is_featured = 1`,
      )
      .bind(profileId)
      .first<{ featured: number; newest: string | null }>(),
    db
      .prepare(
        `SELECT count(*) AS total,
                  count(CASE WHEN status = 'new' THEN 1 END) AS unanswered,
                  count(CASE WHEN status = 'new'
                              AND created_at < datetime('now', '-7 days')
                        THEN 1 END) AS stale,
                  min(CASE WHEN status = 'new' THEN created_at END) AS oldest
             FROM leads
            WHERE profile_id = ?1 AND status <> 'spam'`,
      )
      .bind(profileId)
      .first<{
        total: number;
        unanswered: number;
        stale: number;
        oldest: string | null;
      }>(),
  ]);

  const text = (value: string | null | undefined) => (value ?? '').trim();

  return {
    profile: {
      displayName: text(profile?.display_name),
      handle: text(profile?.handle),
      shortBio: text(profile?.short_bio),
      mediumBio: text(profile?.medium_bio),
      longBio: text(profile?.long_bio),
      avatarKey: text(profile?.avatar_key),
      coverKey: text(profile?.cover_key),
      logoKey: text(profile?.logo_key),
      profession: text(profile?.profession),
      categories: text(profile?.categories),
      skills: text(profile?.skills),
      location: text(profile?.location),
      timezone: text(profile?.timezone),
      pronunciation: text(profile?.pronunciation),
      websiteUrl: text(profile?.website_url),
      visibility: text(profile?.visibility) || 'private',
    },
    contact: {
      publicChannels: visibility?.total ?? 0,
      formEnabled: Boolean(form?.is_enabled),
      notifyOwner: Boolean(form?.notify_owner),
      notifyEmail: form?.notify_email ?? null,
    },
    connections: (connections.results ?? []).map((row) => ({
      provider: String(row.provider),
      displayName: row.display_name,
      providerHandle: row.provider_handle,
      connectionStatus: String(row.connection_status ?? 'unknown'),
      tokenHealth: String(row.token_health ?? 'unknown'),
      tokenExpiresAt: row.token_expires_at,
      lastErrorCode: row.last_error_code,
      lastSyncedAt: row.last_synced_at,
      identityCheckedAt: row.identity_checked_at,
      updatedAt: row.updated_at,
    })),
    links: {
      total: links?.total ?? 0,
      active: links?.active ?? 0,
      expired: (expired.results ?? []).map((row) => ({ label: row.label, endsAt: row.ends_at })),
      duplicateUrls: dupes?.total ?? 0,
      withoutClicks: (quiet.results ?? []).map((row) => row.label),
      broken: (linkStates.results ?? [])
        .filter((row) => row.state === 'broken')
        .map((row) => ({
          label: row.label,
          reason: row.status_code ? `HTTP ${row.status_code}` : (row.error ?? 'unreachable'),
        })),
      redirected: (linkStates.results ?? [])
        .filter((row) => row.state === 'redirected')
        .map((row) => ({ label: row.label, to: row.redirect_url ?? 'a new address' })),
      unchecked: unchecked?.total ?? 0,
    },
    handles: {
      taken: (handles.results ?? [])
        .filter((row) => row.state === 'taken')
        .map((row) => row.provider),
      available: (handles.results ?? [])
        .filter((row) => row.state === 'available')
        .map((row) => row.provider),
      checked: (handles.results ?? []).length,
    },
    content: { featured: content?.featured ?? 0, newestFeaturedAt: content?.newest ?? null },
    leads: {
      total: leads?.total ?? 0,
      unanswered: leads?.unanswered ?? 0,
      unansweredOverAWeek: leads?.stale ?? 0,
      oldestUnansweredAt: leads?.oldest ?? null,
    },
  };
}
