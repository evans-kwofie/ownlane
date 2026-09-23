/**
 * Web Push, sent straight from the Worker.
 *
 * These are **bare** pushes — no encrypted payload. The service worker wakes,
 * asks the server what happened and builds the notification from that. It
 * avoids implementing RFC 8291 payload encryption, and it means a notification
 * shown minutes later still says something true rather than replaying whatever
 * was encrypted at send time.
 *
 * Every failure is contained. A push is a courtesy; the lead is already saved.
 */

const TWELVE_HOURS = 12 * 60 * 60;

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
};

export async function sendPushToWorkspace(env: Env, workspaceId: string) {
  if (!env.VITE_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { sent: 0 };

  const reserved = await env.DB
    .prepare(
      `INSERT INTO lead_push_cooldowns (workspace_id, sent_at) VALUES (?1, CURRENT_TIMESTAMP)
       ON CONFLICT(workspace_id) DO UPDATE SET sent_at = CURRENT_TIMESTAMP
       WHERE lead_push_cooldowns.sent_at < datetime('now', '-5 minutes')`,
    )
    .bind(workspaceId)
    .run();
  if (!reserved.meta.changes) return { sent: 0 };

  const rows = await env.DB.prepare(
    `SELECT id, endpoint FROM push_subscriptions
      WHERE workspace_id = ?1 AND failed_at IS NULL`,
  )
    .bind(workspaceId)
    .all<PushSubscriptionRow>();

  const subscriptions = rows.results ?? [];
  if (!subscriptions.length) return { sent: 0 };

  const results = await Promise.all(
    subscriptions.map((subscription) => deliver(env, subscription)),
  );

  // A push service reports 404 or 410 when a browser has unsubscribed or the
  // subscription expired. Mark those rather than retrying them forever.
  const gone = subscriptions.filter((_, index) => results[index] === 'gone');
  if (gone.length) {
    await env.DB.batch(
      gone.map((subscription) =>
        env.DB.prepare(
          `UPDATE push_subscriptions SET failed_at = CURRENT_TIMESTAMP WHERE id = ?1`,
        ).bind(subscription.id),
      ),
    );
  }

  return { sent: results.filter((result) => result === 'ok').length };
}

async function deliver(env: Env, subscription: PushSubscriptionRow) {
  try {
    const endpoint = new URL(subscription.endpoint);
    const token = await vapidToken(env, endpoint.origin);
    if (!token) return 'skipped';

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${token}, k=${env.VITE_VAPID_PUBLIC_KEY}`,
        TTL: '86400',
        // No payload, so the body is empty and needs no encoding header.
        'Content-Length': '0',
        Urgency: 'normal',
      },
    });

    if (response.status === 404 || response.status === 410) return 'gone';
    return response.ok ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
}

/** The signed JWT that identifies this server to a push service (RFC 8292). */
async function vapidToken(env: Env, audience: string) {
  const key = await importVapidKey(env);
  if (!key) return null;

  const header = base64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = base64url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + TWELVE_HOURS,
      sub: env.VAPID_SUBJECT || 'mailto:support@useownlane.com',
    }),
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );

  return `${header}.${claims}.${base64urlBytes(new Uint8Array(signature))}`;
}

/**
 * VAPID keys are distributed as raw bytes, but WebCrypto wants a JWK. The
 * public key is an uncompressed point (0x04 ‖ X ‖ Y), so X and Y come from it
 * and the private scalar is `d`.
 */
async function importVapidKey(env: Env) {
  const publicBytes = fromBase64url(env.VITE_VAPID_PUBLIC_KEY ?? '');
  const privateBytes = fromBase64url(env.VAPID_PRIVATE_KEY ?? '');
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04 || privateBytes.length !== 32) {
    return null;
  }

  try {
    return await crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        x: base64urlBytes(publicBytes.slice(1, 33)),
        y: base64urlBytes(publicBytes.slice(33, 65)),
        d: base64urlBytes(privateBytes),
        ext: true,
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  } catch {
    return null;
  }
}

function base64url(value: string) {
  return base64urlBytes(new TextEncoder().encode(value));
}

function base64urlBytes(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string) {
  if (!value) return new Uint8Array();
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}
