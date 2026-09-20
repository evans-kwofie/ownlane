import { decryptConnectionToken } from '../connections/token-crypto.server';

type ContentEnv = Pick<Env, 'DB' | 'OWNLANE_TOKEN_ENCRYPTION_KEY' | 'TWITCH_CLIENT_ID'>;
type Account = {
  id: string;
  provider: string;
  providerAccountId: string;
  handle: string | null;
  token: string | null;
};
type Item = {
  providerItemId: string;
  kind: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
};

async function upsert(db: D1Database, profileId: string, account: Account, items: Item[]) {
  if (!items.length) return 0;

  await db.batch(
    items.map((item) =>
      db
        .prepare(
          `INSERT INTO content_items (id, profile_id, connected_account_id, provider, provider_item_id, kind, title, description, url, image_url, published_at, metadata_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, '{}') ON CONFLICT(connected_account_id, provider_item_id) DO UPDATE SET title=excluded.title, description=excluded.description, url=excluded.url, image_url=excluded.image_url, published_at=excluded.published_at, updated_at=CURRENT_TIMESTAMP`,
        )
        .bind(
          crypto.randomUUID(),
          profileId,
          account.id,
          account.provider,
          item.providerItemId,
          item.kind,
          item.title,
          item.description,
          item.url,
          item.imageUrl ?? null,
          item.publishedAt ?? null,
        ),
    ),
  );
  return items.length;
}

export async function importContentForAccount(
  env: ContentEnv,
  profileId: string,
  accountId: string,
) {
  const account = await env.DB.prepare(
    `SELECT a.id, a.provider, a.provider_account_id AS providerAccountId, a.provider_handle AS handle, c.access_token_ciphertext AS token FROM connected_accounts a LEFT JOIN connected_account_credentials c ON c.connected_account_id=a.id WHERE a.id=?1 AND a.profile_id=?2 AND a.connection_status='connected'`,
  )
    .bind(accountId, profileId)
    .first<Account>();
  if (!account) throw new Error('That connection is no longer available.');
  let items: Item[] = [];
  if (account.provider === 'github' && account.handle) {
    const token = account.token
      ? await decryptConnectionToken(account.token, env.OWNLANE_TOKEN_ENCRYPTION_KEY)
      : null;
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(account.handle)}/repos?sort=updated&per_page=20`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Ownlane',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!response.ok) throw new Error('GitHub repositories could not be imported.');
    const repos = (await response.json()) as Array<{
      id: number;
      name: string;
      description: string | null;
      html_url: string;
      updated_at: string;
    }>;
    items = repos
      .filter((repo) => !repo.name.endsWith('.github.io'))
      .map((repo) => ({
        providerItemId: String(repo.id),
        kind: 'repository',
        title: repo.name,
        description: repo.description ?? '',
        url: repo.html_url,
        publishedAt: repo.updated_at,
      }));
  } else if (account.provider === 'twitch' && account.token) {
    const token = await decryptConnectionToken(account.token, env.OWNLANE_TOKEN_ENCRYPTION_KEY);
    const response = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${encodeURIComponent(account.providerAccountId)}&first=20&type=archive`,
      { headers: { Authorization: `Bearer ${token}`, 'Client-Id': env.TWITCH_CLIENT_ID } },
    );
    if (!response.ok) throw new Error('Twitch videos could not be imported.');
    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
        title: string;
        description: string;
        url: string;
        thumbnail_url: string;
        created_at: string;
      }>;
    };
    items = (payload.data ?? []).map((video) => ({
      providerItemId: video.id,
      kind: 'video',
      title: video.title,
      description: video.description ?? '',
      url: video.url,
      imageUrl: video.thumbnail_url.replace('%{width}', '640').replace('%{height}', '360'),
      publishedAt: video.created_at,
    }));
  } else throw new Error('This provider does not support content import yet.');
  return upsert(env.DB, profileId, account, items);
}
