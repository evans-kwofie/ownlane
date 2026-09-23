/**
 * Delivery signing, so a receiver can prove a request came from Ownlane.
 *
 *   Ownlane-Signature: t=<unix seconds>,v1=<hex hmac-sha256>
 *
 * The HMAC covers `${t}.${rawBody}`, not the body alone. Putting the timestamp
 * inside the signed material means it cannot be altered to defeat a replay
 * window — a signature captured today cannot be re-sent tomorrow with the clock
 * moved forward.
 */
export async function signPayload(secret: string, rawBody: string, timestamp: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function signatureHeader(timestamp: number, signature: string) {
  return `t=${timestamp},v1=${signature}`;
}

/** A secret a person can read out loud but nobody can guess. */
export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const body = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `whsec_${body}`;
}
