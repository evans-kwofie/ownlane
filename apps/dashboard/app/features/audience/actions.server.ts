import {
  contactFormSettingsSchema,
  leadNoteSchema,
  leadStatusSchema,
  leadTagSchema,
  type LeadStatus,
} from './schema';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Every mutation re-scopes to the profile in the URL. Client-side visibility is
 * presentation; this is the boundary that actually decides what a request may
 * touch, so no helper here takes a lead id without also taking the profile.
 */

export async function setLeadStatus(
  db: D1Database,
  profileId: string,
  input: { leadIds: string[]; status: LeadStatus },
): Promise<ActionResult> {
  const parsed = leadStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Pick at least one lead and a status.' };

  const { leadIds, status } = parsed.data;
  const placeholders = leadIds.map((_, index) => `?${index + 3}`).join(', ');
  const result = await db
    .prepare(
      `UPDATE leads
          SET status = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = ?2 AND id IN (${placeholders})`,
    )
    .bind(status, profileId, ...leadIds)
    .run();

  return result.success ? { ok: true } : { ok: false, error: 'Could not update those leads.' };
}

/** Marks a lead read the moment it is opened, so the unread count means something. */
export async function markLeadRead(db: D1Database, profileId: string, leadId: string) {
  await db
    .prepare(
      `UPDATE leads SET read_at = CURRENT_TIMESTAMP
        WHERE id = ?1 AND profile_id = ?2 AND read_at IS NULL`,
    )
    .bind(leadId, profileId)
    .run();
}

export async function addLeadNote(
  db: D1Database,
  profileId: string,
  authorUserId: string,
  input: { leadId: string; body: string },
): Promise<ActionResult> {
  const parsed = leadNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write something first.' };
  }
  if (!(await ownsLead(db, profileId, parsed.data.leadId))) {
    return { ok: false, error: 'That lead is not in this workspace.' };
  }

  await db
    .prepare(`INSERT INTO lead_notes (id, lead_id, author_user_id, body) VALUES (?1, ?2, ?3, ?4)`)
    .bind(crypto.randomUUID(), parsed.data.leadId, authorUserId, parsed.data.body)
    .run();
  return { ok: true };
}

export async function deleteLeadNote(
  db: D1Database,
  profileId: string,
  noteId: string,
): Promise<ActionResult> {
  await db
    .prepare(
      `DELETE FROM lead_notes
        WHERE id = ?1
          AND lead_id IN (SELECT id FROM leads WHERE profile_id = ?2)`,
    )
    .bind(noteId, profileId)
    .run();
  return { ok: true };
}

/** Permanently erases the lead and cascades its private notes and tags. */
export async function eraseLead(
  db: D1Database,
  profileId: string,
  userId: string,
  leadId: string,
): Promise<ActionResult> {
  if (!leadId || !(await ownsLead(db, profileId, leadId))) {
    return { ok: false, error: 'That lead is not in this workspace.' };
  }
  await db.batch([
    db
      .prepare(`INSERT INTO lead_erasure_log (id, profile_id, deleted_by_user_id) VALUES (?1, ?2, ?3)`)
      .bind(crypto.randomUUID(), profileId, userId),
    db.prepare(`DELETE FROM leads WHERE id = ?1 AND profile_id = ?2`).bind(leadId, profileId),
  ]);
  return { ok: true };
}

export async function addLeadTag(
  db: D1Database,
  profileId: string,
  input: { leadId: string; tag: string },
): Promise<ActionResult> {
  const parsed = leadTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Name the tag.' };
  }
  if (!(await ownsLead(db, profileId, parsed.data.leadId))) {
    return { ok: false, error: 'That lead is not in this workspace.' };
  }

  await db
    .prepare(`INSERT OR IGNORE INTO lead_tags (lead_id, tag) VALUES (?1, ?2)`)
    .bind(parsed.data.leadId, parsed.data.tag)
    .run();
  return { ok: true };
}

export async function removeLeadTag(
  db: D1Database,
  profileId: string,
  input: { leadId: string; tag: string },
): Promise<ActionResult> {
  await db
    .prepare(
      `DELETE FROM lead_tags
        WHERE tag = ?1
          AND lead_id = ?2
          AND lead_id IN (SELECT id FROM leads WHERE profile_id = ?3)`,
    )
    .bind(input.tag, input.leadId, profileId)
    .run();
  return { ok: true };
}

/** Applies one tag across a selection, so bulk tagging is one round trip. */
export async function tagLeads(
  db: D1Database,
  profileId: string,
  input: { leadIds: string[]; tag: string },
): Promise<ActionResult> {
  const tag = input.tag.trim().slice(0, 24);
  if (!tag || !input.leadIds.length) return { ok: false, error: 'Pick leads and name a tag.' };

  const owned = await db
    .prepare(
      `SELECT id FROM leads
        WHERE profile_id = ?1
          AND id IN (${input.leadIds.map((_, index) => `?${index + 2}`).join(', ')})`,
    )
    .bind(profileId, ...input.leadIds)
    .all<{ id: string }>();

  const rows = owned.results ?? [];
  if (!rows.length) return { ok: false, error: 'Those leads are not in this workspace.' };

  await db.batch(
    rows.map((row) =>
      db
        .prepare(`INSERT OR IGNORE INTO lead_tags (lead_id, tag) VALUES (?1, ?2)`)
        .bind(row.id, tag),
    ),
  );
  return { ok: true };
}

export async function saveContactFormSettings(
  db: D1Database,
  profileId: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const parsed = contactFormSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form settings.' };
  }
  const values = parsed.data;

  // Turning notifications on without somewhere to send them looks like it
  // works and silently does nothing, so refuse it at the boundary.
  if (values.notifyOwner && !values.notifyEmail) {
    return { ok: false, error: 'Add the address to notify, or turn notifications off.' };
  }

  await db
    .prepare(
      `INSERT INTO profile_contact_form (
         profile_id, is_enabled, heading, intro, consent_text,
         ask_subject, ask_phone, notify_owner, notify_email, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
       ON CONFLICT(profile_id) DO UPDATE SET
         is_enabled = excluded.is_enabled,
         heading = excluded.heading,
         intro = excluded.intro,
         consent_text = excluded.consent_text,
         ask_subject = excluded.ask_subject,
         ask_phone = excluded.ask_phone,
         notify_owner = excluded.notify_owner,
         notify_email = excluded.notify_email,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      profileId,
      values.isEnabled ? 1 : 0,
      values.heading,
      values.intro || null,
      values.consentText,
      values.askSubject ? 1 : 0,
      values.askPhone ? 1 : 0,
      values.notifyOwner ? 1 : 0,
      values.notifyEmail || null,
    )
    .run();
  return { ok: true };
}

async function ownsLead(db: D1Database, profileId: string, leadId: string) {
  const row = await db
    .prepare(`SELECT 1 AS found FROM leads WHERE id = ?1 AND profile_id = ?2`)
    .bind(leadId, profileId)
    .first<{ found: number }>();
  return Boolean(row);
}
