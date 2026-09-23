import type { WebhookDelivery, WebhookEndpoint, WebhookEvent } from './schema';

export async function listWebhookEndpoints(
  db: D1Database,
  workspaceId: string,
): Promise<WebhookEndpoint[]> {
  const rows = await db
    .prepare(
      `SELECT e.*,
              (SELECT d.status FROM webhook_deliveries d
                WHERE d.endpoint_id = e.id ORDER BY d.created_at DESC LIMIT 1) AS last_status,
              (SELECT d.response_status FROM webhook_deliveries d
                WHERE d.endpoint_id = e.id ORDER BY d.created_at DESC LIMIT 1) AS last_code,
              (SELECT d.duration_ms FROM webhook_deliveries d
                WHERE d.endpoint_id = e.id ORDER BY d.created_at DESC LIMIT 1) AS last_ms,
              (SELECT d.created_at FROM webhook_deliveries d
                WHERE d.endpoint_id = e.id ORDER BY d.created_at DESC LIMIT 1) AS last_at
         FROM webhook_endpoints e
        WHERE e.workspace_id = ?1
        ORDER BY e.created_at DESC`,
    )
    .bind(workspaceId)
    .all<Record<string, string | number | null>>();

  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    url: String(row.url),
    label: (row.label as string) ?? null,
    secretHint: String(row.secret_hint),
    events: JSON.parse(String(row.events_json)) as WebhookEvent[],
    payloadMode: row.payload_mode === 'minimal' ? 'minimal' : 'full',
    isActive: Boolean(row.is_active),
    disabledReason: (row.disabled_reason as string) ?? null,
    consecutiveFailures: Number(row.consecutive_failures ?? 0),
    createdAt: String(row.created_at),
    lastDelivery: row.last_at
      ? {
          status: String(row.last_status),
          responseStatus: row.last_code === null ? null : Number(row.last_code),
          durationMs: row.last_ms === null ? null : Number(row.last_ms),
          at: String(row.last_at),
        }
      : null,
  }));
}

/** Recent attempts for one endpoint, newest first. */
export async function listWebhookDeliveries(
  db: D1Database,
  workspaceId: string,
  endpointId: string,
): Promise<WebhookDelivery[]> {
  const rows = await db
    .prepare(
      `SELECT d.id, d.event_id, d.event_type, d.status, d.attempt,
              d.response_status, d.duration_ms, d.error, d.created_at
         FROM webhook_deliveries d
         JOIN webhook_endpoints e ON e.id = d.endpoint_id
        WHERE d.endpoint_id = ?1 AND e.workspace_id = ?2
        ORDER BY d.created_at DESC
        LIMIT 20`,
    )
    .bind(endpointId, workspaceId)
    .all<Record<string, string | number | null>>();

  return (rows.results ?? []).map((row) => ({
    id: String(row.id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    status: row.status as WebhookDelivery['status'],
    attempt: Number(row.attempt ?? 0),
    responseStatus: row.response_status === null ? null : Number(row.response_status),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    error: (row.error as string) ?? null,
    createdAt: String(row.created_at),
  }));
}
