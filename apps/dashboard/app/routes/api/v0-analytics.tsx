import { authorize, apiOk, apiError } from '../../features/api/respond.server';
import { analyticsDateRange, readAnalyticsOverview } from '../../features/analytics/queries.server';
import { cloudflare } from '../../lib/cloudflare';
import type { Route } from './+types/v0-analytics';

/** GET /v0/workspaces/:workspace/analytics?start=&end= */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const auth = await authorize(env, args.request, args.params, 'analytics:read');
  if (!auth.ok) return auth.response;

  const url = new URL(args.request.url);
  const range = analyticsDateRange(url.searchParams);
  const overview = await readAnalyticsOverview(env.DB, auth.profileId, range);

  if (!overview) return apiError(404, 'not_found', 'No analytics for that workspace.');

  // Aggregates only. `visitor_hash` and anything else that could identify a
  // person never leaves Ownlane, whatever scope a key carries.
  return apiOk(
    {
      views: overview.views,
      unique_visitors: overview.uniqueVisitors,
      outbound_clicks: overview.outboundClicks,
      click_through_rate: overview.clickThroughRate,
      trend: overview.trend,
      sources: overview.acquisition.map((row) => ({ source: row.source, views: row.views })),
      countries: overview.countries.map((row) => ({ country: row.country, views: row.views })),
      devices: overview.devices,
      campaigns: overview.campaigns,
    },
    { range },
  );
}
