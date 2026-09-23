import { encryptConnectionToken } from '../connections/token-crypto.server';
import { dispatchLeadCreated } from './dispatch.server';
import { generateSecret } from './signing.server';
import { webhookEndpointSchema } from './schema';

export type WebhookResult =
  { ok: true; message: string; secret?: string } | { ok: false; error: string };

/**
 * Creates an endpoint and returns its signing secret **once**.
 *
 * The secret is never readable again — only a four-character hint is kept — so
 * a leaked database row cannot be used to forge deliveries. Rotating issues a
 * new one on the same terms.
 */
export async function createWebhookEndpoint(
  env: Env,
  workspaceId: string,
  userId: string,
  input: Record<string, unknown>,
): Promise<WebhookResult> {
  const parsed = webhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the address.' };
  }

  const existing = await env.DB.prepare(
    `SELECT 1 FROM webhook_endpoints WHERE workspace_id = ?1 AND url = ?2`,
  )
    .bind(workspaceId, parsed.data.url)
    .first();
  if (existing) return { ok: false, error: 'That address already receives events.' };

  const secret = generateSecret();
  await env.DB.prepare(
    `INSERT INTO webhook_endpoints
       (id, workspace_id, url, label, secret_ciphertext, secret_hint,
        events_json, payload_mode, created_by_user_id)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, '["lead.created"]', ?7, ?8)`,
  )
    .bind(
      crypto.randomUUID(),
      workspaceId,
      parsed.data.url,
      parsed.data.label || null,
      await encryptConnectionToken(secret, env.OWNLANE_TOKEN_ENCRYPTION_KEY),
      secret.slice(-4),
      parsed.data.payloadMode,
      userId,
    )
    .run();

  return { ok: true, message: 'Endpoint added', secret };
}

export async function rotateWebhookSecret(
  env: Env,
  workspaceId: string,
  endpointId: string,
): Promise<WebhookResult> {
  const secret = generateSecret();
  const result = await env.DB.prepare(
    `UPDATE webhook_endpoints
        SET secret_ciphertext = ?3, secret_hint = ?4, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND workspace_id = ?2`,
  )
    .bind(
      endpointId,
      workspaceId,
      await encryptConnectionToken(secret, env.OWNLANE_TOKEN_ENCRYPTION_KEY),
      secret.slice(-4),
    )
    .run();

  if (!result.meta.changes) return { ok: false, error: 'That endpoint no longer exists.' };
  return { ok: true, message: 'Secret rotated. The old one stops working now.', secret };
}

export async function deleteWebhookEndpoint(env: Env, workspaceId: string, endpointId: string) {
  await env.DB.prepare(`DELETE FROM webhook_endpoints WHERE id = ?1 AND workspace_id = ?2`)
    .bind(endpointId, workspaceId)
    .run();
  return { ok: true as const, message: 'Endpoint removed' };
}

/** Re-enables an endpoint switched off after repeated failures. */
export async function resumeWebhookEndpoint(env: Env, workspaceId: string, endpointId: string) {
  await env.DB.prepare(
    `UPDATE webhook_endpoints
        SET is_active = 1, disabled_reason = NULL, consecutive_failures = 0,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1 AND workspace_id = ?2`,
  )
    .bind(endpointId, workspaceId)
    .run();
  return { ok: true as const, message: 'Endpoint resumed' };
}

/**
 * Sends a real, signed `lead.created` delivery with obviously fake data.
 *
 * It goes down the same path as a genuine event — same signature, same
 * retry behaviour, same delivery log — because a test that takes a shortcut
 * proves nothing about the path that matters.
 */
export async function sendTestEvent(env: Env, workspaceId: string, endpointId: string) {
  const endpoint = await env.DB.prepare(
    `SELECT 1 FROM webhook_endpoints WHERE id = ?1 AND workspace_id = ?2 AND is_active = 1`,
  )
    .bind(endpointId, workspaceId)
    .first();
  if (!endpoint) return { ok: false as const, error: 'That endpoint is not active.' };

  await dispatchLeadCreated(
    env,
    workspaceId,
    {
      leadId: 'lead_test_0000',
      profileId: 'profile_test_0000',
      name: 'Test Delivery',
      email: 'test@example.com',
      subject: 'This is a test event from Ownlane',
      status: 'new',
    },
    endpointId,
  );

  return { ok: true as const, message: 'Test event sent. Check the delivery log.' };
}
