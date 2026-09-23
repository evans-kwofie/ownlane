import {
  DEFAULT_CONTACT_FORM,
  LEAD_STATUSES,
  type AudienceOverview,
  type ContactFormSettings,
  type Lead,
  type LeadStatus,
  type LeadSummary,
} from './schema';

const PAGE_SIZE = 100;

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: LeadStatus;
  read_at: string | null;
  created_at: string;
  utm_campaign: string | null;
  tags: string | null;
};

export type AudienceFilter = {
  status: LeadStatus | 'all';
  query: string;
  tag: string | null;
  cursor: { createdAt: string; id: string } | null;
};

/** Reads the inbox filter off the URL. Anything unrecognised falls back to the default view. */
export function audienceFilter(search: URLSearchParams): AudienceFilter {
  const status = search.get('status');
  const cursor = search.get('cursor');
  const [createdAt, id] = cursor?.split('|') ?? [];
  return {
    status: LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : 'all',
    query: (search.get('q') ?? '').trim().slice(0, 120),
    tag: (search.get('tag') ?? '').trim().slice(0, 24) || null,
    cursor: createdAt && id ? { createdAt, id } : null,
  };
}

export async function readAudience(
  db: D1Database,
  profileId: string,
  filter: AudienceFilter,
): Promise<AudienceOverview> {
  // `all` hides spam: it is kept for evidence and for recovering a false
  // positive, not for reading alongside real enquiries.
  const status = filter.status === 'all' ? null : filter.status;
  const like = `%${filter.query.replace(/[\\%_]/g, '\\$&')}%`;

  const [leadRows, countRows, tagRows, form] = await Promise.all([
    db
      .prepare(
        `SELECT l.id, l.name, l.email, l.phone, l.subject, l.message, l.status, l.read_at,
                l.created_at, l.utm_campaign,
                (SELECT json_group_array(t.tag) FROM lead_tags t WHERE t.lead_id = l.id) AS tags
           FROM leads l
          WHERE l.profile_id = ?1
            AND (?2 IS NOT NULL OR l.status <> 'spam')
            AND (?2 IS NULL OR l.status = ?2)
            AND (?3 = '' OR l.name LIKE ?4 ESCAPE '\\' OR l.email LIKE ?4 ESCAPE '\\' OR l.message LIKE ?4 ESCAPE '\\')
          AND (?5 IS NULL OR EXISTS (
                  SELECT 1 FROM lead_tags t WHERE t.lead_id = l.id AND t.tag = ?5))
          AND (?6 IS NULL OR (l.created_at, l.id) < (?6, ?7))
          ORDER BY l.created_at DESC, l.id DESC
          LIMIT ${PAGE_SIZE + 1}`,
      )
      .bind(profileId, status, filter.query, like, filter.tag, filter.cursor?.createdAt ?? null, filter.cursor?.id ?? null)
      .all<LeadRow>(),
    db
      .prepare(`SELECT status, count(*) AS total FROM leads WHERE profile_id = ?1 GROUP BY status`)
      .bind(profileId)
      .all<{ status: LeadStatus; total: number }>(),
    db
      .prepare(
        `SELECT DISTINCT t.tag
           FROM lead_tags t
           JOIN leads l ON l.id = t.lead_id
          WHERE l.profile_id = ?1
          ORDER BY t.tag`,
      )
      .bind(profileId)
      .all<{ tag: string }>(),
    readContactFormSettings(db, profileId),
  ]);

  const byStatus = Object.fromEntries(
    (countRows.results ?? []).map((row) => [row.status, row.total]),
  ) as Partial<Record<LeadStatus, number>>;

  const rows = leadRows.results ?? [];
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    leads: page.map(toSummary),
    counts: {
      all: LEAD_STATUSES.filter((status) => status !== 'spam').reduce(
        (total, status) => total + (byStatus[status] ?? 0),
        0,
      ),
      ...(Object.fromEntries(
        LEAD_STATUSES.map((status) => [status, byStatus[status] ?? 0]),
      ) as Record<LeadStatus, number>),
    },
    tags: (tagRows.results ?? []).map((row) => row.tag),
    formEnabled: form.isEnabled,
    nextCursor: rows.length > PAGE_SIZE && last ? `${last.created_at}|${last.id}` : null,
  };
}

export async function readLead(
  db: D1Database,
  profileId: string,
  leadId: string,
): Promise<Lead | null> {
  const row = await db
    .prepare(
      `SELECT l.*,
              (SELECT json_group_array(t.tag) FROM lead_tags t WHERE t.lead_id = l.id) AS tags
         FROM leads l
        WHERE l.id = ?1 AND l.profile_id = ?2`,
    )
    .bind(leadId, profileId)
    .first<
      LeadRow & {
        referrer_host: string | null;
        country_code: string | null;
        utm_source: string | null;
        utm_medium: string | null;
        device_type: Lead['deviceType'];
        consent_text: string;
        consented_at: string;
      }
    >();
  if (!row) return null;

  const notes = await db
    .prepare(
      `SELECT id, body, author_user_id, created_at
         FROM lead_notes WHERE lead_id = ?1 ORDER BY created_at DESC`,
    )
    .bind(leadId)
    .all<{ id: string; body: string; author_user_id: string; created_at: string }>();

  return {
    ...toSummary(row),
    referrerHost: row.referrer_host,
    countryCode: row.country_code,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    deviceType: row.device_type,
    consentText: row.consent_text,
    consentedAt: row.consented_at,
    notes: (notes.results ?? []).map((note) => ({
      id: note.id,
      body: note.body,
      authorUserId: note.author_user_id,
      createdAt: note.created_at,
    })),
  };
}

/** The form's settings, falling back to defaults when it has never been configured. */
export async function readContactFormSettings(
  db: D1Database,
  profileId: string,
): Promise<ContactFormSettings> {
  const row = await db
    .prepare(`SELECT * FROM profile_contact_form WHERE profile_id = ?1`)
    .bind(profileId)
    .first<{
      is_enabled: number;
      heading: string | null;
      intro: string | null;
      consent_text: string | null;
      ask_subject: number;
      ask_phone: number;
      notify_owner: number;
      notify_email: string | null;
    }>();

  return {
    isEnabled: Boolean(row?.is_enabled),
    heading: row?.heading || DEFAULT_CONTACT_FORM.heading,
    intro: row?.intro ?? DEFAULT_CONTACT_FORM.intro,
    consentText: row?.consent_text || DEFAULT_CONTACT_FORM.consentText,
    askSubject: row ? Boolean(row.ask_subject) : true,
    askPhone: Boolean(row?.ask_phone),
    notifyOwner: row ? Boolean(row.notify_owner) : true,
    notifyEmail: row?.notify_email ?? null,
  };
}

/** Every lead for the export, oldest first so an appended file reads chronologically. */
export function readLeadsForExportPage(
  db: D1Database,
  profileId: string,
  after?: { createdAt: string; id: string },
) {
  return db
    .prepare(
      `SELECT l.id, l.created_at, l.name, l.email, l.phone, l.subject, l.message, l.status,
              l.utm_source, l.utm_medium, l.utm_campaign, l.referrer_host, l.country_code,
              l.device_type, l.consent_text, l.consented_at,
              (SELECT json_group_array(t.tag) FROM lead_tags t WHERE t.lead_id = l.id) AS tags
         FROM leads l
        WHERE l.profile_id = ?1
          AND (?2 IS NULL OR (l.created_at, l.id) > (?2, ?3))
        ORDER BY l.created_at, l.id
        LIMIT ?4`,
    )
    .bind(profileId, after?.createdAt ?? null, after?.id ?? null, PAGE_SIZE)
    .all<Record<string, string | null>>();
}

function toSummary(row: LeadRow): LeadSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    isUnread: !row.read_at,
    createdAt: row.created_at,
    utmCampaign: row.utm_campaign,
    tags: row.tags ? parseTags(row.tags) : [],
  };
}

function parseTags(value: string) {
  try {
    const tags: unknown = JSON.parse(value);
    return Array.isArray(tags) && tags.every((tag) => typeof tag === 'string') ? tags : [];
  } catch {
    return [];
  }
}
