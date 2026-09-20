import { useState } from 'react';
import { BarChart3, MousePointerClick, Users, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';
import { DateRangePicker } from './date-range-picker';
import { PageHeader } from '../../page-header';
import type { AnalyticsDateRange, AnalyticsOverview } from '../../../features/analytics/schema';

const interactionLabels: Record<string, string> = {
  contact_booking: 'Booking opened',
  contact_email: 'Email opened',
  contact_phone: 'Phone tapped',
  contact_whatsapp: 'WhatsApp opened',
  copy_link: 'Profile link copied',
  qr_open: 'QR code opened',
  save_contact: 'Contact saved',
  share: 'Profile shared',
  website: 'Website opened',
};

export function AnalyticsWorkspace({
  range,
  overview,
}: {
  range: AnalyticsDateRange;
  overview: AnalyticsOverview;
}) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Analytics"
        description="How people find your profile and what they do next."
        action={
          <DateRangePicker
            value={range}
            onApply={(next) => navigate(`?start=${next.start}&end=${next.end}`)}
          />
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Eye}
          label="Profile views"
          value={overview.views.toLocaleString()}
          previous={overview.comparison.views}
        />
        <Metric
          icon={Users}
          label="Unique visitors"
          value={overview.uniqueVisitors.toLocaleString()}
          previous={overview.comparison.uniqueVisitors}
        />
        <Metric
          icon={MousePointerClick}
          label="Outbound clicks"
          value={overview.outboundClicks.toLocaleString()}
          previous={overview.comparison.outboundClicks}
        />
        <Metric
          icon={BarChart3}
          label="Click-through rate"
          value={`${overview.clickThroughRate}%`}
        />
      </section>
      {!overview.views ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-5 py-10 text-center">
          <p className="font-medium">Waiting for your first signal</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            Visits and intentional actions on your public profile will appear here. Analytics begins
            once someone opens your published profile.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
          <Panel title="Views and clicks">
            <Trend points={overview.trend} />
          </Panel>
          <Panel title="How people found you">
            <Ranked
              rows={overview.acquisition.map((entry) => ({
                label: entry.source,
                value: entry.views,
              }))}
              empty="No acquisition data yet."
            />
          </Panel>
          <Panel title="Top countries">
            <Ranked
              rows={overview.countries.map((entry) => ({
                label: countryName(entry.country),
                value: entry.views,
                note: entry.country,
              }))}
              empty="Country data will appear when Cloudflare provides it."
            />
          </Panel>
          <Panel title="Device mix">
            <Ranked
              rows={overview.devices.map((entry) => ({
                label: entry.device[0].toUpperCase() + entry.device.slice(1),
                value: entry.views,
              }))}
              empty="No device data yet."
            />
          </Panel>
          <Panel title="Campaign performance" className="xl:col-span-2">
            {overview.campaigns.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Campaign</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 text-right font-medium">Views</th>
                      <th className="pb-2 text-right font-medium">Clicks</th>
                      <th className="pb-2 text-right font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {overview.campaigns.map((campaign) => (
                      <tr key={`${campaign.source}:${campaign.medium}:${campaign.campaign}`}>
                        <td className="py-2.5 font-medium">{campaign.campaign}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {campaign.source} · {campaign.medium}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{campaign.views}</td>
                        <td className="py-2.5 text-right tabular-nums">{campaign.clicks}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {campaign.views
                            ? Math.round((campaign.clicks / campaign.views) * 1000) / 10
                            : 0}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Add a <code className="font-mono">utm_campaign</code> to see campaign performance.
              </p>
            )}
          </Panel>
          <Panel title="Top destinations" className="xl:col-span-1">
            <Ranked
              rows={overview.destinations.map((entry) => ({
                label: entry.label,
                value: entry.clicks,
                note: `${entry.type === 'content' ? 'Featured work' : 'Link'} · ${conversionRate(entry.clicks, overview.views)} of profile views`,
              }))}
              empty="No outbound clicks yet."
            />
          </Panel>
          <Panel title="Intent signals" className="xl:col-span-1">
            <Ranked
              rows={overview.interactions.map((entry) => ({
                label: interactionLabels[entry.type] ?? entry.type,
                value: entry.count,
                note: `${conversionRate(entry.count, overview.views)} of profile views`,
              }))}
              empty="No profile actions yet."
            />
          </Panel>
        </div>
      )}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  previous,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  previous?: number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      {previous !== undefined ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {previous ? `${value} vs ${previous} previous period` : 'No previous-period data'}
        </p>
      ) : null}
    </div>
  );
}
function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border/70 bg-card p-5 ${className}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Ranked({
  rows,
  empty,
}: {
  rows: Array<{ label: string; value: number; note?: string }>;
  empty: string;
}) {
  if (!rows.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <ol className="space-y-4">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.value}</span>
          </div>
          {row.note ? <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p> : null}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/75"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
function Trend({ points }: { points: AnalyticsOverview['trend'] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(1, ...points.flatMap((point) => [point.views, point.clicks]));
  const width = 640,
    height = 210,
    padding = 12;
  const path = (key: 'views' | 'clicks') =>
    points
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'} ${padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2)} ${height - padding - (point[key] / max) * (height - padding * 2)}`,
      )
      .join(' ');
  const active = activeIndex === null ? null : points[activeIndex];
  const pointX = (index: number) =>
    padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
  const pointY = (value: number) => height - padding - (value / max) * (height - padding * 2);
  return (
    <>
      <div className="relative">
        <svg
          aria-label="Profile views and outbound clicks over time"
          className="h-52 w-full overflow-visible"
          onMouseLeave={() => setActiveIndex(null)}
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={path('views')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-foreground"
          />
          <path
            d={path('clicks')}
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 5"
            strokeWidth="2"
            className="text-muted-foreground"
          />
          {activeIndex !== null ? (
            <line
              className="text-border"
              stroke="currentColor"
              strokeDasharray="3 3"
              x1={pointX(activeIndex)}
              x2={pointX(activeIndex)}
              y1={padding}
              y2={height - padding}
            />
          ) : null}
          {points.map((point, index) => (
            <g key={point.date}>
              <rect
                aria-label={`${formatTrendDate(point.date)}: ${point.views} views, ${point.clicks} outbound clicks`}
                fill="transparent"
                height={height}
                onFocus={() => setActiveIndex(index)}
                onMouseMove={() => setActiveIndex(index)}
                tabIndex={0}
                width={(width - padding * 2) / Math.max(1, points.length - 1)}
                x={pointX(index) - (width - padding * 2) / Math.max(2, points.length - 1)}
                y="0"
              />
              {activeIndex === index ? (
                <>
                  <circle
                    className="fill-card stroke-foreground"
                    cx={pointX(index)}
                    cy={pointY(point.views)}
                    r="4"
                    strokeWidth="2"
                  />
                  <circle
                    className="fill-card stroke-muted-foreground"
                    cx={pointX(index)}
                    cy={pointY(point.clicks)}
                    r="3.5"
                    strokeWidth="2"
                  />
                </>
              ) : null}
            </g>
          ))}
        </svg>
        {active && activeIndex !== null ? (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
            style={{ left: `${Math.min(92, Math.max(8, (pointX(activeIndex) / width) * 100))}%` }}
          >
            <p className="font-medium text-foreground">{formatTrendDate(active.date)}</p>
            <p className="mt-1 text-muted-foreground">
              {active.views} views · {active.clicks} clicks
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-foreground" />
          Views
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full border border-muted-foreground" />
          Outbound clicks
        </span>
      </div>
    </>
  );
}

function formatTrendDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function conversionRate(actions: number, views: number) {
  return `${views ? Math.round((actions / views) * 1000) / 10 : 0}%`;
}
