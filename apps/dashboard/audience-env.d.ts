/**
 * Bindings and secrets the audience module uses.
 *
 * All four are optional at runtime. Turnstile verification passes when the
 * secret is unset so local development works before the widget exists, and
 * lead notifications are skipped when the email binding or sender is missing —
 * a lead is committed to the database before either is consulted.
 */
interface AudienceEnv {
  /** Cloudflare Turnstile secret, verified server-side. Required in production. */
  TURNSTILE_SECRET_KEY?: string;
  /** Public Turnstile site key. Read in the browser, so it carries the VITE_ prefix. */
  VITE_TURNSTILE_SITE_KEY?: string;
  /** Email Routing send binding. Delivers only to verified destination addresses. */
  LEAD_EMAIL?: SendEmail;
  /** Envelope sender, on a domain this account has verified for sending. */
  LEAD_EMAIL_FROM?: string;
}

interface Env extends AudienceEnv {}

declare namespace Cloudflare {
  interface Env extends AudienceEnv {}
}

/**
 * Web Push. The key pair signs the VAPID token that identifies this server to
 * a push service; without them, push is simply never sent.
 */
interface PushEnv {
  /** Base64url P-256 public key (65-byte uncompressed point). Also read by the browser. */
  VITE_VAPID_PUBLIC_KEY?: string;
  /** Base64url P-256 private scalar, 32 bytes. */
  VAPID_PRIVATE_KEY?: string;
  /** Contact for the push service, as mailto: or https:. */
  VAPID_SUBJECT?: string;
}

interface Env extends PushEnv {}

declare namespace Cloudflare {
  interface Env extends PushEnv {}
}
