import { getFreshAccessToken } from './token-refresh.server';

/**
 * Reads back what a provider currently shows for an account.
 *
 * Nothing else refreshes `display_name` or `provider_handle` after the OAuth
 * connect flow: the sync path pushes Ownlane's values outward and only stamps
 * `last_synced_at`. Without this, any comparison between the canonical profile
 * and a connected account is comparing against a snapshot of unknown age.
 *
 * Stamps `identity_checked_at` on success so callers can tell verified data
 * from assumed data. Failures are contained — a provider being unreachable
 * must not break the page that called this.
 */
export type IdentityRefresh = {
  provider: string;
  ok: boolean;
  displayName?: string | null;
  handle?: string | null;
  error?: string;
};

type Account = { id: string; provider: string };

/** How long a read-back stays trustworthy before it is worth taking again. */
const STALE_AFTER_HOURS = 24;

export async function refreshConnectedIdentities(
  env: Env,
  profileId: string,
  options?: { onlyStale?: boolean },
): Promise<IdentityRefresh[]> {
  // `onlyStale` is what a page visit uses: top up what has gone cold and leave
  // everything else alone, so opening Health repeatedly is not a way to burn
  // through a provider's rate limit.
  const staleClause = options?.onlyStale
    ? `AND (a.identity_checked_at IS NULL
           OR a.identity_checked_at < datetime('now', '-${STALE_AFTER_HOURS} hours'))`
    : '';

  // Expired credentials are no longer excluded here: renewal happens per account
  // below, so a lapsed-but-renewable token is repaired rather than skipped.
  const rows = await env.DB.prepare(
    `SELECT a.id, a.provider
       FROM connected_accounts a
       JOIN connected_account_credentials c ON c.connected_account_id = a.id
      WHERE a.profile_id = ?1
        AND a.connection_status = 'connected'
        ${staleClause}`,
  )
    .bind(profileId)
    .all<Account>();

  const accounts = rows.results ?? [];
  if (!accounts.length) return [];

  return Promise.all(accounts.map((account) => refreshOne(env, account)));
}

async function refreshOne(env: Env, account: Account): Promise<IdentityRefresh> {
  try {
    // Renews first when the credential is near or past expiry, so a lapsed
    // token is repaired rather than producing a 401 nobody can act on.
    const credential = await getFreshAccessToken(env, account.id);
    if (!credential.ok) {
      return {
        provider: account.provider,
        ok: false,
        error:
          credential.reason === 'rejected' || credential.reason === 'no-refresh-token'
            ? 'needs reconnecting'
            : credential.reason,
      };
    }
    const token = credential.accessToken;

    const identity =
      account.provider === 'github'
        ? await readGitHubIdentity(token)
        : account.provider === 'twitch'
          ? await readTwitchIdentity(env, token)
          : null;

    if (!identity) {
      return { provider: account.provider, ok: false, error: 'unsupported' };
    }

    await env.DB.prepare(
      `UPDATE connected_accounts
          SET display_name = ?2, provider_handle = ?3,
              identity_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1`,
    )
      .bind(account.id, identity.displayName, identity.handle)
      .run();

    return { provider: account.provider, ok: true, ...identity };
  } catch (error) {
    return {
      provider: account.provider,
      ok: false,
      error: error instanceof Error ? error.message : 'refresh failed',
    };
  }
}

async function readGitHubIdentity(token: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Ownlane',
    },
  });
  if (!response.ok) throw new Error(`github_${response.status}`);
  const user = (await response.json()) as { name?: string | null; login?: string };
  // GitHub's `name` is optional; an account with none is not drift.
  return { displayName: user.name ?? null, handle: user.login ?? null };
}

async function readTwitchIdentity(env: Env, token: string) {
  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: { Authorization: `Bearer ${token}`, 'Client-Id': env.TWITCH_CLIENT_ID ?? '' },
  });
  if (!response.ok) throw new Error(`twitch_${response.status}`);
  const body = (await response.json()) as {
    data?: Array<{ display_name?: string; login?: string }>;
  };
  const user = body.data?.[0];
  return { displayName: user?.display_name ?? null, handle: user?.login ?? null };
}
