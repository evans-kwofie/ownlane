const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Turnstile token with Cloudflare.
 *
 * Returns `true` when the secret is unset, so a local or preview environment
 * works before the widget exists. That fallback is deliberate and only safe
 * because production sets the secret — an unset secret in production means an
 * unprotected form, so treat `TURNSTILE_SECRET_KEY` as required there.
 */
export async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  remoteIp: string | null,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    // A verification outage must not silently open the form.
    return false;
  }
}
