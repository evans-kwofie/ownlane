import { HANDLE_PROVIDERS, HANDLE_URLS, isCheckableHandle } from './handle-urls';

/**
 * Where your handle stands on the platforms that publish handles as URLs.
 *
 * This is handle coverage, not impersonation detection. It establishes one
 * fact — does `platform.com/yourhandle` resolve, and is it the account you have
 * connected — and says nothing about who owns it or why. Deciding that a
 * stranger is impersonating someone requires judgement no heuristic should be
 * trusted with, and being wrong about it is a serious accusation.
 *
 * A handle that resolves to somebody else is worth knowing about. Calling that
 * person an impersonator is not Ownlane's call to make.
 */

const BATCH_SIZE = 12;
const RECHECK_AFTER_DAYS = 7;
const TIMEOUT_MS = 8_000;

export type HandleState = 'yours' | 'available' | 'taken' | 'unverifiable';

type Target = { provider: string; url: string };

export async function refreshHandleCoverage(env: Env, profileId: string) {
  const profile = await env.DB.prepare(`SELECT handle FROM profiles WHERE id = ?1`)
    .bind(profileId)
    .first<{ handle: string | null }>();

  const handle = (profile?.handle ?? '').trim();
  if (!handle || !isCheckableHandle(handle)) return { checked: 0 };

  // Platforms already connected are answered from our own records: if an
  // account is connected, the handle is demonstrably yours and probing the
  // public page would add nothing.
  const connected = await env.DB.prepare(
    `SELECT provider, provider_handle FROM connected_accounts
      WHERE profile_id = ?1 AND connection_status = 'connected'`,
  )
    .bind(profileId)
    .all<{ provider: string; provider_handle: string | null }>();

  const mine = new Set(
    (connected.results ?? [])
      .filter((row) => row.provider_handle && equivalent(row.provider_handle, handle))
      .map((row) => row.provider),
  );

  // Re-check only what has gone stale, or what was checked against a handle the
  // person has since changed.
  const due = await env.DB.prepare(
    `SELECT provider FROM handle_coverage
      WHERE profile_id = ?1 AND handle = ?2
        AND checked_at > datetime('now', '-${RECHECK_AFTER_DAYS} days')`,
  )
    .bind(profileId, handle)
    .all<{ provider: string }>();

  const fresh = new Set((due.results ?? []).map((row) => row.provider));
  const targets: Target[] = HANDLE_PROVIDERS.filter(
    (provider) => !mine.has(provider) && !fresh.has(provider),
  )
    .slice(0, BATCH_SIZE)
    .map((provider) => ({ provider, url: HANDLE_URLS[provider](handle) }));

  const writes = [
    ...[...mine].map((provider) =>
      upsert(env, profileId, handle, provider, { state: 'yours', statusCode: null }),
    ),
    ...(await Promise.all(
      targets.map(async (target) => {
        const result = await probe(target.url);
        return upsert(env, profileId, handle, target.provider, result);
      }),
    )),
  ];

  if (writes.length) await env.DB.batch(writes);
  return { checked: targets.length };
}

async function probe(url: string): Promise<{ state: HandleState; statusCode: number | null }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': 'Ownlane-HandleCheck/1.0 (+https://useownlane.com)',
        Accept: 'text/html',
      },
    });

    if (response.status === 404 || response.status === 410) {
      return { state: 'available', statusCode: response.status };
    }
    if (response.ok) return { state: 'taken', statusCode: response.status };

    // 403 and 429 are the platform refusing to answer, not evidence either way.
    // Saying "unverifiable" is the honest reading; guessing would invent a fact.
    return { state: 'unverifiable', statusCode: response.status };
  } catch {
    return { state: 'unverifiable', statusCode: null };
  }
}

function upsert(
  env: Env,
  profileId: string,
  handle: string,
  provider: string,
  result: { state: HandleState; statusCode: number | null },
) {
  return env.DB.prepare(
    `INSERT INTO handle_coverage
       (profile_id, provider, handle, state, status_code, checked_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(profile_id, provider) DO UPDATE SET
       handle = excluded.handle,
       state = excluded.state,
       status_code = excluded.status_code,
       checked_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(profileId, provider, handle, result.state, result.statusCode);
}

function equivalent(a: string, b: string) {
  const normalise = (value: string) => value.toLowerCase().replace(/[\s._-]/g, '');
  return normalise(a) === normalise(b);
}
