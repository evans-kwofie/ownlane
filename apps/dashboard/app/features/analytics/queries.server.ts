import type { AnalyticsDateRange, AnalyticsOverview } from './schema';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

export function analyticsDateRange(search: URLSearchParams): AnalyticsDateRange {
  const today = new Date();
  const fallbackEnd = formatDate(today);
  const fallbackStart = formatDate(new Date(today.getTime() - 29 * 86_400_000));
  const start = search.get('start') ?? fallbackStart;
  const end = search.get('end') ?? fallbackEnd;

  if (
    !DATE.test(start) ||
    !DATE.test(end) ||
    start > end ||
    daysBetween(start, end) > MAX_RANGE_DAYS
  ) {
    return { start: fallbackStart, end: fallbackEnd };
  }
  return { start, end };
}

export async function readAnalyticsOverview(
  db: D1Database,
  profileId: string,
  range: AnalyticsDateRange,
): Promise<AnalyticsOverview> {
  const endExclusive = addDays(range.end, 1);
  const rangeDays = daysBetween(range.start, range.end) + 1;
  const previousEnd = addDays(range.start, -1);
  const previousStart = addDays(previousEnd, -(rangeDays - 1));
  const [summary, trendRows, destinationRows, acquisitionRows, countryRows, interactionRows] =
    await Promise.all([
      db
        .prepare(
          `SELECT
          count(CASE WHEN event_type = 'profile_view' THEN 1 END) AS views,
          count(DISTINCT CASE WHEN event_type = 'profile_view' THEN visitor_hash END) AS uniqueVisitors,
          count(CASE WHEN event_type = 'outbound_click' THEN 1 END) AS outboundClicks
         FROM analytics_events
        WHERE profile_id = ?1 AND occurred_at >= ?2 AND occurred_at < ?3`,
        )
        .bind(profileId, range.start, endExclusive)
        .first<{ views: number; uniqueVisitors: number; outboundClicks: number }>(),
      db
        .prepare(
          `SELECT date(occurred_at) AS date,
                count(CASE WHEN event_type = 'profile_view' THEN 1 END) AS views,
                count(CASE WHEN event_type = 'outbound_click' THEN 1 END) AS clicks
           FROM analytics_events
          WHERE profile_id = ?1 AND occurred_at >= ?2 AND occurred_at < ?3
          GROUP BY date(occurred_at)
          ORDER BY date(occurred_at)`,
        )
        .bind(profileId, range.start, endExclusive)
        .all<{ date: string; views: number; clicks: number }>(),
      db
        .prepare(
          `SELECT e.destination_id AS id, e.destination_type AS type,
                coalesce(l.label, c.title, 'Removed destination') AS label,
                count(*) AS clicks
           FROM analytics_events e
           LEFT JOIN profile_links l ON l.id = e.destination_id AND e.destination_type = 'link'
           LEFT JOIN content_items c ON c.id = e.destination_id AND e.destination_type = 'content'
          WHERE e.profile_id = ?1 AND e.event_type = 'outbound_click'
            AND e.occurred_at >= ?2 AND e.occurred_at < ?3
          GROUP BY e.destination_id, e.destination_type
          ORDER BY clicks DESC, label
          LIMIT 8`,
        )
        .bind(profileId, range.start, endExclusive)
        .all<{ id: string; type: 'link' | 'content'; label: string; clicks: number }>(),
      db
        .prepare(
          `SELECT coalesce(nullif(utm_source, ''), nullif(referrer_host, ''), 'Direct') AS source,
                count(*) AS views
           FROM analytics_events
          WHERE profile_id = ?1 AND event_type = 'profile_view'
            AND occurred_at >= ?2 AND occurred_at < ?3
          GROUP BY source
          ORDER BY views DESC, source
          LIMIT 6`,
        )
        .bind(profileId, range.start, endExclusive)
        .all<{ source: string; views: number }>(),
      db
        .prepare(
          `SELECT country_code AS country, count(*) AS views
           FROM analytics_events
          WHERE profile_id = ?1 AND event_type = 'profile_view'
            AND country_code IS NOT NULL AND occurred_at >= ?2 AND occurred_at < ?3
          GROUP BY country_code
          ORDER BY views DESC, country_code
          LIMIT 6`,
        )
        .bind(profileId, range.start, endExclusive)
        .all<{ country: string; views: number }>(),
      db
        .prepare(
          `SELECT interaction_type AS type, count(*) AS count
           FROM analytics_events
          WHERE profile_id = ?1 AND event_type = 'profile_interaction'
            AND occurred_at >= ?2 AND occurred_at < ?3
          GROUP BY interaction_type
          ORDER BY count DESC, interaction_type`,
        )
        .bind(profileId, range.start, endExclusive)
        .all<{ type: string | null; count: number }>(),
    ]);

  const [previousSummary, deviceRows, campaignRows] = await Promise.all([
    readSummary(db, profileId, previousStart, range.start),
    db
      .prepare(
        `SELECT device_type AS device, count(*) AS views
           FROM analytics_events
          WHERE profile_id = ?1 AND event_type = 'profile_view'
            AND occurred_at >= ?2 AND occurred_at < ?3
          GROUP BY device_type
          ORDER BY views DESC, device_type`,
      )
      .bind(profileId, range.start, endExclusive)
      .all<{ device: 'desktop' | 'mobile' | 'tablet' | 'unknown'; views: number }>(),
    db
      .prepare(
        `SELECT utm_source AS source, utm_medium AS medium, utm_campaign AS campaign,
                count(CASE WHEN event_type = 'profile_view' THEN 1 END) AS views,
                count(CASE WHEN event_type = 'outbound_click' THEN 1 END) AS clicks
           FROM analytics_events
          WHERE profile_id = ?1 AND utm_campaign IS NOT NULL
            AND occurred_at >= ?2 AND occurred_at < ?3
          GROUP BY utm_source, utm_medium, utm_campaign
          ORDER BY views DESC, clicks DESC, campaign
          LIMIT 8`,
      )
      .bind(profileId, range.start, endExclusive)
      .all<{
        source: string | null;
        medium: string | null;
        campaign: string;
        views: number;
        clicks: number;
      }>(),
  ]);

  const views = summary?.views ?? 0;
  const outboundClicks = summary?.outboundClicks ?? 0;
  const trendByDate = new Map((trendRows.results ?? []).map((row) => [row.date, row]));

  return {
    views,
    uniqueVisitors: summary?.uniqueVisitors ?? 0,
    outboundClicks,
    clickThroughRate: views ? Math.round((outboundClicks / views) * 1000) / 10 : 0,
    comparison: {
      views: previousSummary?.views ?? 0,
      uniqueVisitors: previousSummary?.uniqueVisitors ?? 0,
      outboundClicks: previousSummary?.outboundClicks ?? 0,
    },
    trend: datesInRange(range).map(
      (date) => trendByDate.get(date) ?? { date, views: 0, clicks: 0 },
    ),
    destinations: destinationRows.results ?? [],
    acquisition: acquisitionRows.results ?? [],
    countries: countryRows.results ?? [],
    devices: deviceRows.results ?? [],
    campaigns: (campaignRows.results ?? []).map((row) => ({
      ...row,
      source: row.source || 'Unspecified source',
      medium: row.medium || 'Unspecified medium',
    })),
    interactions: (interactionRows.results ?? []).flatMap((row) =>
      row.type ? [{ type: row.type, count: row.count }] : [],
    ),
  };
}

function readSummary(db: D1Database, profileId: string, start: string, endExclusive: string) {
  return db
    .prepare(
      `SELECT count(CASE WHEN event_type = 'profile_view' THEN 1 END) AS views, count(DISTINCT CASE WHEN event_type = 'profile_view' THEN visitor_hash END) AS uniqueVisitors, count(CASE WHEN event_type = 'outbound_click' THEN 1 END) AS outboundClicks FROM analytics_events WHERE profile_id = ?1 AND occurred_at >= ?2 AND occurred_at < ?3`,
    )
    .bind(profileId, start, endExclusive)
    .first<{ views: number; uniqueVisitors: number; outboundClicks: number }>();
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function daysBetween(start: string, end: string) {
  return Math.floor(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

function datesInRange(range: AnalyticsDateRange) {
  const dates: string[] = [];
  for (let date = range.start; date <= range.end; date = addDays(date, 1)) dates.push(date);
  return dates;
}
