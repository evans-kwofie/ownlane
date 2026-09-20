type AnalyticsEvent = {
  profileId: string;
  type: 'profile_view' | 'outbound_click' | 'profile_interaction';
  interaction?: string;
  destination?: { type: 'link' | 'content'; id: string };
};

const VISITOR_COOKIE = 'ol_visitor';
const ONE_YEAR = 60 * 60 * 24 * 365;

function cookieValue(request: Request, name: string) {
  const value = request.headers.get('Cookie') ?? '';
  return value
    .split(';')
    .map((entry) => entry.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

function isBot(request: Request) {
  return /bot|crawler|spider|headless|preview|facebookexternalhit|slackbot/i.test(
    request.headers.get('User-Agent') ?? '',
  );
}

function deviceType(request: Request): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const agent = request.headers.get('User-Agent') ?? '';
  if (!agent) return 'unknown';
  if (/ipad|tablet/i.test(agent)) return 'tablet';
  if (/mobi|android|iphone|ipod/i.test(agent)) return 'mobile';
  return 'desktop';
}

function countryCode(request: Request) {
  const workerCountry = (request as Request & { cf?: { country?: unknown } }).cf?.country;
  const candidate =
    typeof workerCountry === 'string' ? workerCountry : request.headers.get('CF-IPCountry');
  return candidate && /^[A-Z]{2}$/.test(candidate) && candidate !== 'XX' ? candidate : null;
}

function attribution(request: Request) {
  try {
    const referrer = new URL(request.headers.get('Referer') ?? '');
    const current = new URL(request.url);
    const ownSite = referrer.origin === current.origin;
    return {
      referrerHost: ownSite ? null : referrer.hostname.slice(0, 255),
      utmSource: ownSite ? (referrer.searchParams.get('utm_source')?.slice(0, 120) ?? null) : null,
      utmMedium: ownSite ? (referrer.searchParams.get('utm_medium')?.slice(0, 120) ?? null) : null,
      utmCampaign: ownSite
        ? (referrer.searchParams.get('utm_campaign')?.slice(0, 120) ?? null)
        : null,
    };
  } catch {
    return { referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null };
  }
}

async function visitorHash(visitorId: string, salt: string) {
  const month = new Date().toISOString().slice(0, 7);
  const bytes = new TextEncoder().encode(`${salt}:${month}:${visitorId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function visitor(request: Request) {
  const existing = cookieValue(request, VISITOR_COOKIE);
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return { id: existing, setCookie: null };

  const id = crypto.randomUUID();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return {
    id,
    setCookie: `${VISITOR_COOKIE}=${id}; HttpOnly; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`,
  };
}

/** Records only first-party, aggregate-friendly signals. It never persists an IP or user agent. */
export async function recordAnalyticsEvent(env: Env, request: Request, event: AnalyticsEvent) {
  // Analytics is optional at runtime until the workspace secret is configured.
  // A missing secret must never turn into a predictable visitor identifier or
  // make an outbound redirect fail.
  if (isBot(request) || !env.ANALYTICS_VISITOR_SALT || env.ANALYTICS_VISITOR_SALT.length < 24) {
    return { setCookie: null };
  }

  const visitorIdentity = visitor(request);
  const source = attribution(request);
  await env.DB.prepare(
    `INSERT INTO analytics_events (
      id, profile_id, event_type, interaction_type, destination_type, destination_id, visitor_hash,
      referrer_host, utm_source, utm_medium, utm_campaign, device_type, country_code
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
  )
    .bind(
      crypto.randomUUID(),
      event.profileId,
      event.type,
      event.interaction ?? null,
      event.destination?.type ?? null,
      event.destination?.id ?? null,
      await visitorHash(visitorIdentity.id, env.ANALYTICS_VISITOR_SALT),
      source.referrerHost,
      source.utmSource,
      source.utmMedium,
      source.utmCampaign,
      deviceType(request),
      countryCode(request),
    )
    .run();

  return { setCookie: visitorIdentity.setCookie };
}

export function isFirstPartyRequest(request: Request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}
