import { CONNECTION_PROVIDERS } from './providers';
import { HANDLE_URLS, platformOrigin } from './handle-urls';

export type HandleCoverageRow = {
  provider: string;
  name: string;
  state: 'yours' | 'available' | 'taken' | 'unverifiable' | 'unknown';
  url: string;
  origin: string | null;
};

export type HandleCoverage = {
  handle: string | null;
  rows: HandleCoverageRow[];
  counts: { yours: number; available: number; taken: number; unverifiable: number };
};

/**
 * Handle coverage for display, one row per checkable platform.
 *
 * Platforms never checked appear as `unknown` rather than being hidden, so the
 * list reads as "here is every platform and what we know", not a selective
 * summary that implies the rest were fine.
 */
export async function readHandleCoverage(
  db: D1Database,
  profileId: string,
): Promise<HandleCoverage> {
  const profile = await db
    .prepare(`SELECT handle FROM profiles WHERE id = ?1`)
    .bind(profileId)
    .first<{ handle: string | null }>();

  const handle = (profile?.handle ?? '').trim() || null;
  if (!handle) {
    return {
      handle: null,
      rows: [],
      counts: { yours: 0, available: 0, taken: 0, unverifiable: 0 },
    };
  }

  const stored = await db
    .prepare(
      `SELECT provider, state FROM handle_coverage
        WHERE profile_id = ?1 AND handle = ?2`,
    )
    .bind(profileId, handle)
    .all<{ provider: string; state: HandleCoverageRow['state'] }>();

  const byProvider = new Map((stored.results ?? []).map((row) => [row.provider, row.state]));
  const names = new Map(CONNECTION_PROVIDERS.map((provider) => [provider.id, provider.name]));

  const rows: HandleCoverageRow[] = Object.keys(HANDLE_URLS)
    .map((provider) => ({
      provider,
      name: names.get(provider) ?? provider,
      state: byProvider.get(provider) ?? ('unknown' as const),
      url: HANDLE_URLS[provider](handle),
      origin: platformOrigin(provider),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    handle,
    rows,
    counts: {
      yours: rows.filter((row) => row.state === 'yours').length,
      available: rows.filter((row) => row.state === 'available').length,
      taken: rows.filter((row) => row.state === 'taken').length,
      unverifiable: rows.filter((row) => row.state === 'unverifiable').length,
    },
  };
}
