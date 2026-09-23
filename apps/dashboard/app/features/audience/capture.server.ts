import { isBot, requestSignals, visitorIdentity } from '../analytics/events.server';
import { sendPushToWorkspace } from '../notifications/push.server';
import { dispatchLeadCreated } from '../webhooks/dispatch.server';
import { sendLeadNotification } from './email.server';
import { readContactFormSettings } from './queries.server';
import { leadCaptureSchema } from './schema';
import { verifyTurnstile } from './turnstile.server';

/** A single visitor may send this many messages to one profile per hour. */
const HOURLY_LIMIT = 3;

export type CaptureResult =
  | { ok: true; setCookie: string | null }
  | { ok: false; formErrors: Record<string, string>; message?: string };

/**
 * Accepts a public contact-form submission.
 *
 * Nothing the browser sends is trusted: the schema is re-validated here, the
 * Turnstile token is verified with Cloudflare, and the consent wording written
 * onto the lead is read from the database rather than taken from the form, so
 * a tampered field cannot rewrite what someone appears to have agreed to.
 */
export async function captureLead(
  env: Env,
  ctx: ExecutionContext,
  request: Request,
  input: {
    profileId: string;
    workspaceId: string;
    profileName: string;
    slug: string;
    form: FormData;
  },
): Promise<CaptureResult> {
  const settings = await readContactFormSettings(env.DB, input.profileId);
  if (!settings.isEnabled) {
    return { ok: false, formErrors: {}, message: 'This profile is not accepting messages.' };
  }

  const parsed = leadCaptureSchema.safeParse(Object.fromEntries(input.form));
  if (!parsed.success) {
    return { ok: false, formErrors: fieldErrors(parsed.error) };
  }
  const values = parsed.data;

  // The honeypot is never shown to a person, so anything in it is automation.
  // Answer as though it worked: telling a bot it failed only teaches it.
  if (values.website) return { ok: true, setCookie: null };
  if (isBot(request)) return { ok: true, setCookie: null };

  const human = await verifyTurnstile(
    env,
    values.turnstileToken,
    request.headers.get('CF-Connecting-IP'),
  );
  if (!human) {
    return {
      ok: false,
      formErrors: {},
      message: 'That check did not pass. Reload the page and try once more.',
    };
  }

  const identity = await visitorIdentity(env, request);
  const rateLimitHash = identity.hash ?? (await ephemeralIpHash(request));
  if (await isOverLimit(env.DB, input.profileId, rateLimitHash, values.email)) {
    return {
      ok: false,
      formErrors: {},
      message: 'You have already sent a few messages. Give it an hour before sending another.',
    };
  }

  const signals = requestSignals(request);
  const leadId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO leads (
       id, profile_id, name, email, phone, subject, message,
       visitor_hash, referrer_host, country_code,
       utm_source, utm_medium, utm_campaign, device_type,
       consent_text, consented_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, CURRENT_TIMESTAMP)`,
  )
    .bind(
      leadId,
      input.profileId,
      values.name,
      values.email,
      values.phone || null,
      settings.askSubject ? values.subject || null : null,
      values.message,
      rateLimitHash,
      signals.referrerHost,
      signals.countryCode,
      signals.utmSource,
      signals.utmMedium,
      signals.utmCampaign,
      signals.deviceType,
      // Read from settings, never from the submitted form.
      settings.consentText,
    )
    .run();

  // All of these are courtesies on top of a lead that is already saved, so none
  // of them is allowed to fail the submission or hold up the response.
  ctx.waitUntil(sendPushToWorkspace(env, input.workspaceId).catch(() => undefined));
  ctx.waitUntil(
    dispatchLeadCreated(env, input.workspaceId, {
      leadId,
      profileId: input.profileId,
      name: values.name,
      email: values.email,
      subject: values.subject || null,
      status: 'new',
    }).catch(() => undefined),
  );

  if (settings.notifyOwner && settings.notifyEmail) {
    ctx.waitUntil(
      sendLeadNotification(env, {
        to: settings.notifyEmail,
        profileName: input.profileName,
        leadName: values.name,
        leadEmail: values.email,
        subject: values.subject || null,
        message: values.message,
        leadUrl: `${new URL(request.url).origin}/app`,
      }).catch(() => undefined),
    );
  }

  return { ok: true, setCookie: identity.setCookie };
}

/** A daily, non-persistent-IP fallback when analytics identity is disabled. */
async function ephemeralIpHash(request: Request) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`lead-rate-limit:${day}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Rate limiting on top of Turnstile, for the case where a token is replayed or
 * a real person submits repeatedly. Counts by visitor when the analytics salt
 * is configured, and by email address otherwise, so it still applies when it is
 * not.
 */
async function isOverLimit(
  db: D1Database,
  profileId: string,
  visitorHash: string | null,
  email: string,
) {
  const row = await db
    .prepare(
      `SELECT count(*) AS total
         FROM leads
        WHERE profile_id = ?1
          AND created_at > datetime('now', '-1 hour')
          AND (( ?2 IS NOT NULL AND visitor_hash = ?2) OR (?2 IS NULL AND email = ?3))`,
    )
    .bind(profileId, visitorHash, email)
    .first<{ total: number }>();
  return (row?.total ?? 0) >= HOURLY_LIMIT;
}

function fieldErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
