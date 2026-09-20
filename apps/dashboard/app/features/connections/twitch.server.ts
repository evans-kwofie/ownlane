import type { Profile } from '../../lib/profiles';
import { decryptConnectionToken, encryptConnectionToken } from './token-crypto.server';

const AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const REVOKE_URL = 'https://id.twitch.tv/oauth2/revoke';
const API_URL = 'https://api.twitch.tv/helix';
const CAPABILITIES = [
  { field: 'displayName', label: 'Display name', access: 'read' },
  { field: 'avatar', label: 'Profile image', access: 'read' },
  { field: 'bio', label: 'Channel description', access: 'read-write' },
  { field: 'username', label: 'Username', access: 'read' },
] as const;

type EnvForTwitch = Pick<Env, 'DB' | 'TWITCH_CLIENT_ID' | 'TWITCH_CLIENT_SECRET' | 'OWNLANE_TOKEN_ENCRYPTION_KEY'>;
type Token = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string[]; error?: string; message?: string };

export function twitchIsConfigured(env: Partial<Env>) {
  return Boolean(env.TWITCH_CLIENT_ID?.trim() && env.TWITCH_CLIENT_SECRET?.trim());
}

export function buildTwitchAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'user:edit');
  url.searchParams.set('state', input.state);
  return url.toString();
}

async function twitchRequest(url: string, token: string, clientId: string, init: RequestInit = {}) {
  return fetch(url, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Client-Id': clientId, ...init.headers } });
}

export async function connectTwitchAccount(env: EnvForTwitch, input: { code: string; redirectUri: string; profileId: string; userId: string }) {
  const tokenResponse = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, code: input.code, grant_type: 'authorization_code', redirect_uri: input.redirectUri }) });
  const token = (await tokenResponse.json()) as Token;
  if (!tokenResponse.ok || !token.access_token) throw new Error(token.message || token.error || 'Twitch did not issue an access token.');
  const userResponse = await twitchRequest(`${API_URL}/users`, token.access_token, env.TWITCH_CLIENT_ID);
  const user = (await userResponse.json()) as { data?: Array<{ id: string; login: string; display_name: string }> };
  const account = user.data?.[0];
  if (!userResponse.ok || !account) throw new Error('Twitch account details could not be loaded.');
  const id = crypto.randomUUID();
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO connected_accounts (id, profile_id, provider, provider_account_id, provider_handle, display_name, account_type, connection_status, capabilities_json, scopes_json, token_health, token_expires_at, sync_mode, connection_owner_user_id, updated_at) VALUES (?1, ?2, 'twitch', ?3, ?4, ?5, 'user', 'connected', ?6, ?7, 'healthy', ?8, 'manual', ?9, CURRENT_TIMESTAMP) ON CONFLICT(profile_id, provider, provider_account_id) DO UPDATE SET provider_handle=excluded.provider_handle, display_name=excluded.display_name, connection_status='connected', capabilities_json=excluded.capabilities_json, scopes_json=excluded.scopes_json, token_health='healthy', token_expires_at=excluded.token_expires_at, connection_owner_user_id=excluded.connection_owner_user_id, updated_at=CURRENT_TIMESTAMP`).bind(id, input.profileId, account.id, account.login, account.display_name, JSON.stringify(CAPABILITIES), JSON.stringify(token.scope ?? []), expiresAt, input.userId),
    env.DB.prepare(`INSERT INTO connected_account_credentials (connected_account_id, access_token_ciphertext, refresh_token_ciphertext) VALUES (?1, ?2, ?3) ON CONFLICT(connected_account_id) DO UPDATE SET access_token_ciphertext=excluded.access_token_ciphertext, refresh_token_ciphertext=excluded.refresh_token_ciphertext, updated_at=CURRENT_TIMESTAMP`).bind(id, await encryptConnectionToken(token.access_token, env.OWNLANE_TOKEN_ENCRYPTION_KEY), token.refresh_token ? await encryptConnectionToken(token.refresh_token, env.OWNLANE_TOKEN_ENCRYPTION_KEY) : null),
  ]);
}

export async function syncTwitchProfile(env: EnvForTwitch, input: { accountId: string; profile: Profile }) {
  const account = await env.DB.prepare(`SELECT a.provider_account_id AS providerAccountId, c.access_token_ciphertext AS token FROM connected_accounts a JOIN connected_account_credentials c ON c.connected_account_id=a.id WHERE a.id=?1 AND a.profile_id=?2 AND a.provider='twitch' AND a.connection_status='connected'`).bind(input.accountId, input.profile.id).first<{ providerAccountId: string; token: string }>();
  if (!account) throw new Error('This Twitch connection is no longer available.');
  const token = await decryptConnectionToken(account.token, env.OWNLANE_TOKEN_ENCRYPTION_KEY);
  const response = await twitchRequest(`${API_URL}/users?description=${encodeURIComponent(input.profile.shortBio)}`, token, env.TWITCH_CLIENT_ID, { method: 'PUT' });
  if (!response.ok) throw new Error(`Twitch rejected this channel update (HTTP ${response.status}).`);
  await env.DB.prepare(`UPDATE connected_accounts SET last_synced_at=CURRENT_TIMESTAMP, token_health='healthy', last_error_code=NULL, last_error_message=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?1`).bind(input.accountId).run();
}

export async function revokeTwitchConnection(env: EnvForTwitch, profileId: string, accountId: string) {
  const account = await env.DB.prepare(`SELECT c.access_token_ciphertext AS token FROM connected_accounts a JOIN connected_account_credentials c ON c.connected_account_id=a.id WHERE a.id=?1 AND a.profile_id=?2 AND a.provider='twitch'`).bind(accountId, profileId).first<{ token: string }>();
  if (!account) return true;
  const token = await decryptConnectionToken(account.token, env.OWNLANE_TOKEN_ENCRYPTION_KEY);
  const response = await fetch(REVOKE_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, token }) });
  return response.ok;
}
