import { decryptConnectionToken } from '../connections/token-crypto.server';
import { signPayload, signatureHeader } from './signing.server';

/**
 * Delivering events to customer endpoints.
 *
 * The first attempt runs inline after the response that produced the event, so
 * a receiver usually hears within a second. Anything that fails is retried from
 * the cron, which is why `webhook_deliveries` holds the exact bytes that were
 * signed: re-serialising a parsed object would change the body and the stored
 * signature would no longer verify.
 */

/**
 * Backoff between attempts. The cron ticks every five minutes, so that is the
 * finest granularity available; the doc's 1-minute first retry is not
 * achievable without a queue and is not worth a new binding for.
 */
const BACKOFF_MINUTES = [5, 30, 120, 360];
/** Consecutive permanent failures before an endpoint is switched off. */
const FAILURES_BEFORE_DISABLED = 5;
const TIMEOUT_MS = 10_000;
/** Deliveries retried per cron tick. */
const RETRY_BATCH = 20;

export type LeadCreatedEvent = {
  leadId: string;
  profileId: string;
  name: string;
  email: string;
  subject: string | null;
  status: string;
};

type Endpoint = {
  id: string;
  url: string;
  secret_ciphertext: string;
  payload_mode: 'full' | 'minimal';
  consecutive_failures: number;
};

/**
 * Queues a `lead.created` event for every active endpoint subscribed to it, then
 * attempts each immediately. Never throws: the lead is already saved, and a
 * webhook problem must not surface as a failed form submission.
 */
export async function dispatchLeadCreated(
  env: Env,
  workspaceId: string,
  lead: LeadCreatedEvent,
  // Set when testing one endpoint: a test must not deliver to the others.
  onlyEndpointId?: string,
) {
  const rows = await env.DB.prepare(
    `SELECT id, url, secret_ciphertext, payload_mode, consecutive_failures
       FROM webhook_endpoints
      WHERE workspace_id = ?1 AND is_active = 1
        AND events_json LIKE '%lead.created%'
        AND (?2 IS NULL OR id = ?2)`,
  )
    .bind(workspaceId, onlyEndpointId ?? null)
    .all<Endpoint>();

  const endpoints = rows.results ?? [];
  if (!endpoints.length) return { delivered: 0 };

  const eventId = `evt_${crypto.randomUUID().replace(/-/g, '')}`;
  const occurredAt = new Date().toISOString();

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      // Built per endpoint, because the payload mode is per endpoint: an
      // endpoint that only needs to know a lead arrived never receives the
      // person's name or address.
      const body = JSON.stringify({
        id: eventId,
        type: 'lead.created',
        occurred_at: occurredAt,
        workspace_id: workspaceId,
        data:
          endpoint.payload_mode === 'minimal'
            ? { lead_id: lead.leadId, profile_id: lead.profileId }
            : {
                lead_id: lead.leadId,
                profile_id: lead.profileId,
                name: lead.name,
                email: lead.email,
                subject: lead.subject,
                status: lead.status,
              },
      });

      const deliveryId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO webhook_deliveries
           (id, endpoint_id, event_id, event_type, payload_json, status)
         VALUES (?1, ?2, ?3, 'lead.created', ?4, 'pending')`,
      )
        .bind(deliveryId, endpoint.id, eventId, body)
        .run();

      return attempt(env, {
        deliveryId,
        endpoint,
        body,
        attemptNumber: 1,
      });
    }),
  );

  return { delivered: results.filter(Boolean).length };
}

/** Retries whatever is due. Driven by the cron. */
export async function retryDueDeliveries(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT d.id AS delivery_id, d.payload_json, d.attempt,
            e.id, e.url, e.secret_ciphertext, e.payload_mode, e.consecutive_failures
       FROM webhook_deliveries d
       JOIN webhook_endpoints e ON e.id = d.endpoint_id
      WHERE d.status = 'pending'
        AND d.next_attempt_at IS NOT NULL
        AND d.next_attempt_at <= CURRENT_TIMESTAMP
        AND e.is_active = 1
      ORDER BY d.next_attempt_at
      LIMIT ${RETRY_BATCH}`,
  ).all<Endpoint & { delivery_id: string; payload_json: string; attempt: number }>();

  const due = rows.results ?? [];
  if (!due.length) return { retried: 0 };

  const results = await Promise.all(
    due.map((row) =>
      attempt(env, {
        deliveryId: row.delivery_id,
        endpoint: row,
        body: row.payload_json,
        attemptNumber: row.attempt + 1,
      }),
    ),
  );

  return { retried: results.length };
}

/** One signed POST, and everything that follows from how it went. */
async function attempt(
  env: Env,
  input: { deliveryId: string; endpoint: Endpoint; body: string; attemptNumber: number },
) {
  const { deliveryId, endpoint, body, attemptNumber } = input;
  const startedAt = Date.now();

  let responseStatus: number | null = null;
  let error: string | null = null;

  try {
    const secret = await decryptConnectionToken(
      endpoint.secret_ciphertext,
      env.OWNLANE_TOKEN_ENCRYPTION_KEY,
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signPayload(secret, body, timestamp);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'Ownlane-Signature': signatureHeader(timestamp, signature),
        'Ownlane-Event': 'lead.created',
        'User-Agent': 'Ownlane-Webhooks/1.0 (+https://useownlane.com)',
      },
      body,
    });
    responseStatus = response.status;
    if (!response.ok) error = `HTTP ${response.status}`;
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 200) : 'request failed';
  }

  const durationMs = Date.now() - startedAt;
  const succeeded = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

  // A 4xx other than 408 or 429 means the receiver understood and refused.
  // Retrying that is just noise; anything else is worth another go.
  const permanent =
    responseStatus !== null &&
    responseStatus >= 400 &&
    responseStatus < 500 &&
    responseStatus !== 408 &&
    responseStatus !== 429;

  const exhausted = attemptNumber > BACKOFF_MINUTES.length;
  const nextDelay = BACKOFF_MINUTES[attemptNumber - 1];
  const willRetry = !succeeded && !permanent && !exhausted;

  await env.DB.prepare(
    `UPDATE webhook_deliveries
        SET attempt = ?2,
            status = ?3,
            response_status = ?4,
            duration_ms = ?5,
            error = ?6,
            next_attempt_at = ?7,
            completed_at = CASE WHEN ?3 = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
      WHERE id = ?1`,
  )
    .bind(
      deliveryId,
      attemptNumber,
      succeeded ? 'succeeded' : willRetry ? 'pending' : permanent ? 'failed' : 'exhausted',
      responseStatus,
      durationMs,
      error,
      willRetry ? new Date(Date.now() + nextDelay * 60_000).toISOString() : null,
    )
    .run();

  await updateEndpointHealth(env, endpoint, succeeded, permanent || exhausted);
  return succeeded;
}

/**
 * An endpoint that keeps refusing is switched off rather than retried forever.
 * Disabling is visible — it records why — so it never looks like deliveries
 * simply stopped.
 */
async function updateEndpointHealth(
  env: Env,
  endpoint: Endpoint,
  succeeded: boolean,
  gaveUp: boolean,
) {
  if (succeeded) {
    if (!endpoint.consecutive_failures) return;
    await env.DB.prepare(
      `UPDATE webhook_endpoints
          SET consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1`,
    )
      .bind(endpoint.id)
      .run();
    return;
  }

  if (!gaveUp) return;

  const failures = endpoint.consecutive_failures + 1;
  const disable = failures >= FAILURES_BEFORE_DISABLED;

  await env.DB.prepare(
    `UPDATE webhook_endpoints
        SET consecutive_failures = ?2,
            is_active = ?3,
            disabled_reason = ?4,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1`,
  )
    .bind(
      endpoint.id,
      failures,
      disable ? 0 : 1,
      disable ? `Switched off after ${failures} failed deliveries in a row.` : null,
    )
    .run();
}
