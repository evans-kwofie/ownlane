import { decryptConnectionToken, encryptConnectionToken } from './token-crypto.server';

/**
 * Keeps stored provider credentials usable.
 *
 * A refresh token was captured when the account was connected and, until now,
 * nothing ever read it — so a provider with short-lived access tokens broke a
 * few hours after connecting and stayed broken. Renewing is Ownlane's job, not
 * something to ask a person to do; nobody using this product should ever be
 * told their OAuth token lapsed.
 *
 * Renewal runs in two places: proactively on the cron, so connections stay
 * alive with nobody watching, and defensively before any call that needs a
 * token, so a cold path still works.
 */

/** Renew this far ahead of expiry, so a slow job never races the deadline. */
const RENEW_BEFORE_MINUTES = 30;

type Credentials = {
  id: string;
  provider: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
};

export type TokenOutcome =
  | { ok: true; accessToken: string; renewed: boolean }
  | { ok: false; reason: 'no-account' | 'no-refresh-token' | 'rejected' | 'unsupported' };

/**
 * The usable access token for an account, renewing first when it is close to
 * expiry. Callers should use this rather than reading the ciphertext directly.
 */
export async function getFreshAccessToken(env: Env, accountId: string): Promise<TokenOutcome> {
  const account = await env.DB.prepare(
    `SELECT a.id, a.provider, a.token_expires_at,
            c.access_token_ciphertext, c.refresh_token_ciphertext
       FROM connected_accounts a
       JOIN connected_account_credentials c ON c.connected_account_id = a.id
      WHERE a.id = ?1`,
  )
    .bind(accountId)
    .first<Credentials>();

  if (!account) return { ok: false, reason: 'no-account' };

  if (!needsRenewal(account.token_expires_at)) {
    return {
      ok: true,
      renewed: false,
      accessToken: await decryptConnectionToken(
        account.access_token_ciphertext,
        env.OWNLANE_TOKEN_ENCRYPTION_KEY,
      ),
    };
  }

  return renew(env, account);
}

/**
 * Renews every credential near expiry, across every workspace. Run from the
 * cron so a connection nobody has opened in a week is still alive.
 */
export async function renewExpiringTokens(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT a.id, a.provider, a.token_expires_at,
            c.access_token_ciphertext, c.refresh_token_ciphertext
       FROM connected_accounts a
       JOIN connected_account_credentials c ON c.connected_account_id = a.id
      WHERE a.connection_status = 'connected'
        AND a.token_expires_at IS NOT NULL
        AND c.refresh_token_ciphertext IS NOT NULL
        AND a.token_expires_at < datetime('now', '+${RENEW_BEFORE_MINUTES} minutes')
      LIMIT 100`,
  ).all<Credentials>();

  const accounts = rows.results ?? [];
  if (!accounts.length) return { renewed: 0, failed: 0 };

  const results = await Promise.all(accounts.map((account) => renew(env, account)));
  return {
    renewed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  };
}

async function renew(env: Env, account: Credentials): Promise<TokenOutcome> {
  if (!account.refresh_token_ciphertext) {
    await markExpired(env, account.id, 'no_refresh_token');
    return { ok: false, reason: 'no-refresh-token' };
  }
  if (account.provider !== 'twitch') {
    // GitHub's user tokens do not expire, so there is nothing to renew. Any
    // other provider needs its own exchange before it can be renewed here.
    return { ok: false, reason: 'unsupported' };
  }

  const refreshToken = await decryptConnectionToken(
    account.refresh_token_ciphertext,
    env.OWNLANE_TOKEN_ENCRYPTION_KEY,
  );

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID ?? '',
      client_secret: env.TWITCH_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // A refused refresh token is terminal: the person revoked access, or it was
    // already rotated away. Reconnecting is the only path, so say so.
    await markExpired(env, account.id, `twitch_refresh_${response.status}`);
    return { ok: false, reason: 'rejected' };
  }

  const token = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!token.access_token) {
    await markExpired(env, account.id, 'twitch_refresh_empty');
    return { ok: false, reason: 'rejected' };
  }

  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE connected_account_credentials
          SET access_token_ciphertext = ?2,
              refresh_token_ciphertext = coalesce(?3, refresh_token_ciphertext),
              updated_at = CURRENT_TIMESTAMP
        WHERE connected_account_id = ?1`,
    ).bind(
      account.id,
      await encryptConnectionToken(token.access_token, env.OWNLANE_TOKEN_ENCRYPTION_KEY),
      // Twitch rotates refresh tokens; keep the old one if none came back.
      token.refresh_token
        ? await encryptConnectionToken(token.refresh_token, env.OWNLANE_TOKEN_ENCRYPTION_KEY)
        : null,
    ),
    env.DB.prepare(
      `UPDATE connected_accounts
          SET token_expires_at = ?2, token_health = 'healthy',
              last_error_code = NULL, last_error_message = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1`,
    ).bind(account.id, expiresAt),
  ]);

  return { ok: true, accessToken: token.access_token, renewed: true };
}

async function markExpired(env: Env, accountId: string, code: string) {
  await env.DB.prepare(
    `UPDATE connected_accounts
        SET token_health = 'expired', last_error_code = ?2,
            last_error_message = 'This connection needs to be reconnected.',
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1`,
  )
    .bind(accountId, code)
    .run();
}

/**
 * Whether a credential is close enough to expiry to renew. Reads the clock
 * rather than the stored `token_health` verdict, which is only written at
 * connect time and goes stale silently.
 */
export function needsRenewal(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt.includes('T') ? expiresAt : `${expiresAt.replace(' ', 'T')}Z`);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() - now.getTime() < RENEW_BEFORE_MINUTES * 60_000;
}
