/**
 * Checks that link destinations still work.
 *
 * Runs on the cron rather than on read: a page render cannot wait on an
 * outbound request to a site that may be down, and probing on every view would
 * hammer whatever a popular profile points at.
 *
 * The bias throughout is against crying wolf. A link is only called broken
 * after a run of failures, because sites blip, and a redirect is reported as
 * something to tidy rather than something that is wrong.
 */

/** How many links one cron tick probes. Keeps a tick well inside its budget. */
const BATCH_SIZE = 20;
/** Re-check a link no more often than this. */
const RECHECK_AFTER_HOURS = 24;
/** Consecutive failures before a link is called broken rather than blipping. */
const FAILURES_BEFORE_BROKEN = 3;
/** A slow site is not a broken one, but it cannot hold the batch up either. */
const TIMEOUT_MS = 8_000;
/** At most this many probes to the same host per tick. */
const PER_HOST_LIMIT = 3;

export type LinkState = 'ok' | 'redirected' | 'broken' | 'unreachable' | 'skipped';

type Candidate = { id: string; url: string; failures: number };

type Probe = {
  state: LinkState;
  statusCode: number | null;
  redirectUrl: string | null;
  error: string | null;
};

export async function checkDueLinks(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT l.id, l.url, coalesce(h.consecutive_failures, 0) AS failures
       FROM profile_links l
       LEFT JOIN link_health h ON h.link_id = l.id
      WHERE l.is_active = 1
        AND (h.last_checked_at IS NULL
             OR h.last_checked_at < datetime('now', '-${RECHECK_AFTER_HOURS} hours'))
      ORDER BY h.last_checked_at IS NOT NULL, h.last_checked_at
      LIMIT ${BATCH_SIZE}`,
  ).all<Candidate>();

  const candidates = capPerHost(rows.results ?? []);
  if (!candidates.length) return { checked: 0, broken: 0 };

  const results = await Promise.all(
    candidates.map(async (link) => ({ link, probe: await probe(link.url) })),
  );

  await env.DB.batch(results.map(({ link, probe }) => write(env, link, probe)));

  return {
    checked: results.length,
    broken: results.filter(
      ({ link, probe }) => isFailure(probe.state) && link.failures + 1 >= FAILURES_BEFORE_BROKEN,
    ).length,
  };
}

/**
 * A profile with eight links to one domain should not send eight requests at
 * once. The rest are simply picked up by a later tick.
 */
function capPerHost(candidates: Candidate[]) {
  const seen = new Map<string, number>();
  return candidates.filter((link) => {
    let host: string;
    try {
      host = new URL(link.url).hostname;
    } catch {
      return true; // Malformed: let the probe classify it as skipped.
    }
    const count = seen.get(host) ?? 0;
    if (count >= PER_HOST_LIMIT) return false;
    seen.set(host, count + 1);
    return true;
  });
}

async function probe(rawUrl: string): Promise<Probe> {
  const url = parseCheckable(rawUrl);
  if (!url) {
    return {
      state: 'skipped',
      statusCode: null,
      redirectUrl: null,
      error: 'not a public http(s) address',
    };
  }

  try {
    // `manual` so a redirect is visible rather than silently followed — a link
    // that has moved is worth knowing about even though it still resolves.
    let response = await request(url, 'HEAD');

    // Plenty of servers reject HEAD outright. Falling back to GET on those
    // statuses avoids reporting a healthy page as broken.
    if ([400, 403, 405, 404, 501].includes(response.status)) {
      response = await request(url, 'GET');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      return {
        // A temporary redirect is normal routing; a permanent one means the
        // destination has actually moved and the link should be updated.
        state: response.status === 301 || response.status === 308 ? 'redirected' : 'ok',
        statusCode: response.status,
        redirectUrl: location ? new URL(location, url).toString().slice(0, 1000) : null,
        error: null,
      };
    }

    if (response.ok) {
      return { state: 'ok', statusCode: response.status, redirectUrl: null, error: null };
    }

    return {
      // A 5xx is the destination having a bad day; a 4xx is the page being gone.
      state: response.status >= 500 ? 'unreachable' : 'broken',
      statusCode: response.status,
      redirectUrl: null,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      state: 'unreachable',
      statusCode: null,
      redirectUrl: null,
      error: error instanceof Error ? error.message.slice(0, 200) : 'request failed',
    };
  }
}

function request(url: string, method: 'HEAD' | 'GET') {
  return fetch(url, {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      // Some sites serve 403 to unidentified clients. Saying who we are, and
      // why, is better manners than pretending to be a browser.
      'User-Agent': 'Ownlane-LinkCheck/1.0 (+https://useownlane.com)',
      Accept: '*/*',
    },
  });
}

/** Only public http(s) destinations can be probed meaningfully. */
function parseCheckable(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  return isPrivate ? null : url.toString();
}

function isFailure(state: LinkState) {
  return state === 'broken' || state === 'unreachable';
}

function write(env: Env, link: Candidate, probe: Probe) {
  const failed = isFailure(probe.state);
  const failures = failed ? link.failures + 1 : 0;

  // Below the threshold a failing link is held as `unreachable` rather than
  // `broken`, so a single bad minute never surfaces as a finding.
  const state: LinkState =
    failed && failures < FAILURES_BEFORE_BROKEN ? 'unreachable' : probe.state;

  return env.DB.prepare(
    `INSERT INTO link_health
       (link_id, state, status_code, redirect_url, consecutive_failures,
        last_checked_at, last_ok_at, error, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, ?6, ?7, CURRENT_TIMESTAMP)
     ON CONFLICT(link_id) DO UPDATE SET
       state = excluded.state,
       status_code = excluded.status_code,
       redirect_url = excluded.redirect_url,
       consecutive_failures = excluded.consecutive_failures,
       last_checked_at = CURRENT_TIMESTAMP,
       last_ok_at = coalesce(excluded.last_ok_at, link_health.last_ok_at),
       error = excluded.error,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(
    link.id,
    state,
    probe.statusCode,
    probe.redirectUrl,
    failures,
    failed ? null : new Date().toISOString(),
    probe.error,
  );
}
