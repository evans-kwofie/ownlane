import { decryptConnectionToken, encryptConnectionToken } from './token-crypto.server';
import type { Profile } from '../../lib/profiles';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2026-03-10';

export const GITHUB_CAPABILITIES = [
  { field: 'displayName', label: 'Display name', access: 'read-write' },
  { field: 'avatar', label: 'Profile image', access: 'read' },
  { field: 'bio', label: 'Biography', access: 'read-write' },
  { field: 'website', label: 'Website', access: 'read-write' },
  { field: 'location', label: 'Location', access: 'read-write' },
  { field: 'email', label: 'Public email', access: 'read-write' },
  { field: 'twitterUsername', label: 'X username', access: 'read-write' },
  { field: 'company', label: 'Company', access: 'read-write' },
  { field: 'hireable', label: 'Hiring availability', access: 'read-write' },
  { field: 'username', label: 'Username', access: 'read' },
] as const;

type GitHubEnvironment = Pick<
  Env,
  | 'DB'
  | 'GITHUB_APP_SLUG'
  | 'GITHUB_CLIENT_ID'
  | 'GITHUB_CLIENT_SECRET'
  | 'OWNLANE_TOKEN_ENCRYPTION_KEY'
>;

type GitHubTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  type: string;
};

export function githubIsConfigured(env: Partial<Env>) {
  return Boolean(
    env.GITHUB_APP_SLUG?.trim() && env.GITHUB_CLIENT_ID?.trim() && env.GITHUB_CLIENT_SECRET?.trim(),
  );
}

export function buildGitHubInstallationUrl(input: { appSlug: string; state: string }) {
  const appSlug = input.appSlug.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(appSlug)) throw new Error('Invalid GitHub App slug.');
  const url = new URL(`https://github.com/apps/${appSlug}/installations/new`);
  // GitHub returns this value to the App setup URL after installation.
  url.searchParams.set('state', input.state);
  return url.toString();
}

export function buildGitHubAuthorizationUrl(input: {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

function normalizeXUsername(value: string) {
  const candidate = value.trim().replace(/^@/, '');
  return /^[a-z0-9_]{1,15}$/i.test(candidate) ? candidate : null;
}

function xUsernameFromUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'x.com' && host !== 'twitter.com') return null;
    const [username] = url.pathname.split('/').filter(Boolean);
    if (!username || ['home', 'intent', 'share', 'i', 'search'].includes(username.toLowerCase()))
      return null;
    return normalizeXUsername(username);
  } catch {
    return null;
  }
}

/** A verified X connection wins; one unambiguous active X link is the fallback. */
async function resolveXUsername(db: D1Database, profileId: string) {
  const accounts = await db
    .prepare(
      `SELECT provider_handle AS handle FROM connected_accounts
        WHERE profile_id = ?1 AND provider IN ('x', 'twitter')
          AND connection_status = 'connected' AND provider_handle IS NOT NULL`,
    )
    .bind(profileId)
    .all<{ handle: string }>();
  const connected = [
    ...new Set(
      (accounts.results ?? []).flatMap((row) => {
        const username = normalizeXUsername(row.handle);
        return username ? [username] : [];
      }),
    ),
  ];
  if (connected.length === 1) return connected[0];
  if (connected.length > 1) return null;

  const links = await db
    .prepare(
      `SELECT url FROM profile_links
        WHERE profile_id = ?1 AND platform_key = 'x' AND is_active = 1`,
    )
    .bind(profileId)
    .all<{ url: string }>();
  const linked = [
    ...new Set(
      (links.results ?? []).flatMap((row) => {
        const username = xUsernameFromUrl(row.url);
        return username ? [username] : [];
      }),
    ),
  ];
  return linked.length === 1 ? linked[0] : null;
}

/** Pushes only fields GitHub's authenticated-user profile endpoint accepts. */
export async function syncGitHubProfile(
  env: GitHubEnvironment,
  input: { accountId: string; profile: Profile },
) {
  const account = await env.DB.prepare(
    `SELECT a.id, a.sync_preferences_json AS syncPreferencesJson,
            c.access_token_ciphertext AS accessTokenCiphertext
       FROM connected_accounts a
       JOIN connected_account_credentials c ON c.connected_account_id = a.id
      WHERE a.id = ?1 AND a.profile_id = ?2 AND a.provider = 'github'
        AND a.connection_status = 'connected'`,
  )
    .bind(input.accountId, input.profile.id)
    .first<{
      id: string;
      syncPreferencesJson: string;
      accessTokenCiphertext: string;
    }>();
  if (!account) throw new Error('This GitHub connection is no longer available.');

  let preferences: { fields?: unknown } = {};
  try {
    preferences = JSON.parse(account.syncPreferencesJson) as { fields?: unknown };
  } catch {
    // An invalid stored preference is treated as the default: all supported fields.
  }
  const selected = Array.isArray(preferences.fields)
    ? new Set(preferences.fields.filter((field): field is string => typeof field === 'string'))
    : new Set<string>();
  const allows = (field: string) => !selected.size || selected.has(field);
  const location =
    input.profile.location ||
    [input.profile.city, input.profile.country].filter(Boolean).join(', ');
  const changes: Record<string, string | boolean> = {};
  const fields: string[] = [];
  if (allows('displayName')) {
    changes.name = input.profile.displayName;
    fields.push('displayName');
  }
  if (allows('bio')) {
    changes.bio = input.profile.shortBio;
    fields.push('bio');
  }
  if (allows('website')) {
    changes.blog = input.profile.websiteUrl;
    fields.push('website');
  }
  if (allows('location')) {
    changes.location = location;
    fields.push('location');
  }
  if (allows('email') && input.profile.publicEmail) {
    changes.email = input.profile.publicEmail;
    fields.push('email');
  }
  if (allows('company') && input.profile.company) {
    changes.company = input.profile.company;
    fields.push('company');
  }
  if (allows('hireable') && input.profile.availabilityStatus !== 'unspecified') {
    changes.hireable = ['available', 'selective'].includes(input.profile.availabilityStatus);
    fields.push('hireable');
  }
  if (allows('twitterUsername')) {
    const username = await resolveXUsername(env.DB, input.profile.id);
    if (username) {
      changes.twitter_username = username;
      fields.push('twitterUsername');
    }
  }
  if (!fields.length) throw new Error('Choose at least one GitHub field to sync.');

  const accessToken = await decryptConnectionToken(
    account.accessTokenCiphertext,
    env.OWNLANE_TOKEN_ENCRYPTION_KEY,
  );
  const updateGitHubProfile = (payload: Record<string, string | boolean>) =>
    fetch(`${GITHUB_API_URL}/user`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Ownlane',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      body: JSON.stringify(payload),
    });
  let response = await updateGitHubProfile(changes);

  // GitHub rejects the entire patch when the requested public email is not
  // eligible for the account. Do not let that optional value block the rest
  // of the canonical profile from synchronizing.
  if (response.status === 422 && changes.email !== undefined) {
    const payload = await response
      .clone()
      .json<{ errors?: Array<{ field?: string }> }>()
      .catch(() => null);
    if (payload?.errors?.some((error) => error.field === 'profile_email')) {
      delete changes.email;
      const emailIndex = fields.indexOf('email');
      if (emailIndex >= 0) fields.splice(emailIndex, 1);
      console.warn(
        'GitHub rejected the configured public email; retrying the remaining profile fields without it.',
      );
      response = await updateGitHubProfile(changes);
    }
  }
  if (!response.ok) {
    const responseText = await response.text();
    let githubMessage = '';
    let githubErrors: Array<{ field: string; code: string }> = [];
    try {
      const payload = JSON.parse(responseText) as {
        message?: unknown;
        errors?: Array<{ field?: unknown; code?: unknown }>;
      };
      githubMessage = typeof payload.message === 'string' ? payload.message : '';
      githubErrors = Array.isArray(payload.errors)
        ? payload.errors.map((error) => ({
            field: typeof error.field === 'string' ? error.field : 'unknown',
            code: typeof error.code === 'string' ? error.code : 'unknown',
          }))
        : [];
    } catch {
      githubMessage = responseText;
    }
    // GitHub's response explains permission and validation failures. It does
    // not contain the access token, so this is safe operational diagnostics.
    console.error('GitHub profile update rejected', {
      status: response.status,
      statusText: response.statusText,
      message: githubMessage,
      validationErrors: githubErrors,
      submittedFields: Object.keys(changes),
      acceptedPermissions: response.headers.get('X-Accepted-GitHub-Permissions'),
    });
    const expired = response.status === 401;
    const detail = githubMessage || `GitHub returned HTTP ${response.status}.`;
    await env.DB.prepare(
      `UPDATE connected_accounts
          SET connection_status = CASE WHEN ?2 THEN 'reconnect_required' ELSE connection_status END,
              token_health = CASE WHEN ?2 THEN 'expired' ELSE token_health END,
              last_error_code = ?3, last_error_message = ?4, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1`,
    )
      .bind(
        account.id,
        expired ? 1 : 0,
        `github_${response.status}`,
        expired
          ? 'GitHub authorization expired. Reconnect this account and try again.'
          : `GitHub could not update this profile: ${detail}`,
      )
      .run();
    throw new Error(
      expired
        ? 'GitHub authorization has expired. Reconnect and try again.'
        : `GitHub rejected this profile update: ${detail}`,
    );
  }

  await env.DB.prepare(
    `UPDATE connected_accounts
        SET last_synced_at = CURRENT_TIMESTAMP, token_health = 'healthy',
            last_error_code = NULL, last_error_message = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?1`,
  )
    .bind(account.id)
    .run();
  return fields;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export async function createGitHubPkcePair() {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) };
}

export async function connectGitHubAccount(
  env: GitHubEnvironment,
  input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    profileId: string;
    userId: string;
  },
) {
  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    }),
  });
  const token = (await tokenResponse.json()) as GitHubTokenResponse;
  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(
      token.error_description || token.error || 'GitHub did not issue an access token.',
    );
  }
  console.info('GitHub authorization token received', {
    tokenType: token.token_type ?? null,
    scopes: token.scope ?? '',
    expiresIn: token.expires_in ?? null,
    refreshTokenExpiresIn: token.refresh_token_expires_in ?? null,
    hasRefreshToken: Boolean(token.refresh_token),
  });

  const userResponse = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'Ownlane',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  });
  if (!userResponse.ok) throw new Error('GitHub account details could not be loaded.');
  const user = (await userResponse.json()) as GitHubUser;
  console.info('GitHub authenticated account', {
    id: user.id,
    login: user.login,
    name: user.name,
    type: user.type,
  });

  const providerAccountId = String(user.id);
  const existing = await env.DB.prepare(
    'SELECT id FROM connected_accounts WHERE profile_id = ?1 AND provider = ?2 AND provider_account_id = ?3',
  )
    .bind(input.profileId, 'github', providerAccountId)
    .first<{ id: string }>();
  const accountId = existing?.id ?? crypto.randomUUID();
  const now = new Date();
  const expiresAt = token.expires_in
    ? new Date(now.getTime() + token.expires_in * 1_000).toISOString()
    : null;
  const accessTokenCiphertext = await encryptConnectionToken(
    token.access_token,
    env.OWNLANE_TOKEN_ENCRYPTION_KEY,
  );
  const refreshTokenCiphertext = token.refresh_token
    ? await encryptConnectionToken(token.refresh_token, env.OWNLANE_TOKEN_ENCRYPTION_KEY)
    : null;
  const scopes = (token.scope ?? '')
    .split(/[ ,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO connected_accounts
        (id, profile_id, provider, provider_account_id, provider_handle, display_name,
         account_type, connection_status, capabilities_json, scopes_json, token_health,
         token_expires_at, sync_mode, connection_owner_user_id, last_error_code,
         last_error_message, updated_at)
       VALUES (?1, ?2, 'github', ?3, ?4, ?5, ?6, 'connected', ?7, ?8, 'healthy',
               ?9, 'manual', ?10, NULL, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT(profile_id, provider, provider_account_id) DO UPDATE SET
         provider_handle = excluded.provider_handle,
         display_name = excluded.display_name,
         account_type = excluded.account_type,
         connection_status = 'connected',
         capabilities_json = excluded.capabilities_json,
         scopes_json = excluded.scopes_json,
         token_health = 'healthy',
         token_expires_at = excluded.token_expires_at,
         connection_owner_user_id = excluded.connection_owner_user_id,
         last_error_code = NULL,
         last_error_message = NULL,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(
      accountId,
      input.profileId,
      providerAccountId,
      user.login,
      user.name || user.login,
      user.type.toLowerCase(),
      JSON.stringify(GITHUB_CAPABILITIES),
      JSON.stringify(scopes),
      expiresAt,
      input.userId,
    ),
    env.DB.prepare(
      `INSERT INTO connected_account_credentials
        (connected_account_id, access_token_ciphertext, refresh_token_ciphertext)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(connected_account_id) DO UPDATE SET
         access_token_ciphertext = excluded.access_token_ciphertext,
         refresh_token_ciphertext = excluded.refresh_token_ciphertext,
         encryption_key_version = 1,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(accountId, accessTokenCiphertext, refreshTokenCiphertext),
  ]);

  return { accountId, handle: user.login };
}

export async function revokeGitHubConnection(
  env: GitHubEnvironment,
  profileId: string,
  accountId: string,
) {
  const account = await env.DB.prepare(
    `SELECT a.provider, c.access_token_ciphertext AS accessTokenCiphertext
       FROM connected_accounts a
       LEFT JOIN connected_account_credentials c ON c.connected_account_id = a.id
      WHERE a.id = ?1 AND a.profile_id = ?2`,
  )
    .bind(accountId, profileId)
    .first<{ provider: string; accessTokenCiphertext: string | null }>();

  if (!account || account.provider !== 'github' || !account.accessTokenCiphertext) return true;

  try {
    const accessToken = await decryptConnectionToken(
      account.accessTokenCiphertext,
      env.OWNLANE_TOKEN_ENCRYPTION_KEY,
    );
    const credentials = btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`);
    const response = await fetch(
      `${GITHUB_API_URL}/applications/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/token`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Ownlane',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
        body: JSON.stringify({ access_token: accessToken }),
      },
    );
    // A missing token has already been revoked, which is the desired end state.
    return response.ok || response.status === 404;
  } catch (error) {
    console.error('GitHub token revocation failed', error);
    return false;
  }
}
