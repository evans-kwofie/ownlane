import { useMemo, useState } from 'react';
import { BarChart3, MousePointerClick, Users, Eye, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Donut, type DonutSegment } from '@ownlane/ui/components/donut';
import { Sparkline } from '@ownlane/ui/components/sparkline';
import { chartSlotColor, type ChartSlot } from '@ownlane/ui/lib/chart';
import { useMeasuredWidth } from '@ownlane/ui/hooks/use-measured-width';
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

const deviceLabels: Record<AnalyticsOverview['devices'][number]['device'], string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
  unknown: 'Unknown',
};

/**
 * Device slots are keyed by device type, not by rank, so changing the date
 * range never repaints them. `unknown` takes the grey remainder slot because
 * it is an absence of data rather than an entity of its own.
 */
const deviceSlots: Record<AnalyticsOverview['devices'][number]['device'], ChartSlot> = {
  mobile: 1,
  desktop: 2,
  tablet: 3,
  unknown: 'rest',
};

export function AnalyticsWorkspace({
  range,
  overview,
}: {
  range: AnalyticsDateRange;
  overview: AnalyticsOverview;
}) {
  const navigate = useNavigate();
  const previousRate = overview.comparison.views
    ? (overview.comparison.outboundClicks / overview.comparison.views) * 100
    : null;

  const acquisitionSegments: DonutSegment[] = [
    ...overview.acquisition.map((entry, index) => ({
      id: entry.source,
      label: entry.source,
      value: entry.views,
      slot: (index + 1) as ChartSlot,
    })),
    ...(overview.acquisitionOther
      ? [
          {
            id: '__other',
            label: 'Other sources',
            value: overview.acquisitionOther,
            slot: 'rest' as ChartSlot,
          },
        ]
      : []),
  ];

  const deviceSegments: DonutSegment[] = overview.devices.map((entry) => ({
    id: entry.device,
    label: deviceLabels[entry.device],
    value: entry.views,
    slot: deviceSlots[entry.device],
  }));

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
          slot={1}
          value={overview.views.toLocaleString()}
          current={overview.views}
          previous={overview.comparison.views}
          series={overview.trend.map((point) => point.views)}
        />
        <Metric
          icon={Users}
          label="Unique visitors"
          slot={2}
          value={overview.uniqueVisitors.toLocaleString()}
          current={overview.uniqueVisitors}
          previous={overview.comparison.uniqueVisitors}
        />
        <Metric
          icon={MousePointerClick}
          label="Outbound clicks"
          slot={3}
          value={overview.outboundClicks.toLocaleString()}
          current={overview.outboundClicks}
          previous={overview.comparison.outboundClicks}
          series={overview.trend.map((point) => point.clicks)}
        />
        <Metric
          icon={BarChart3}
          label="Click-through rate"
          slot={4}
          value={`${overview.clickThroughRate}%`}
          current={overview.clickThroughRate}
          previous={previousRate}
          unit="points"
          series={overview.trend.map((point) =>
            point.views ? Math.round((point.clicks / point.views) * 1000) / 10 : 0,
          )}
        />
      </section>
      {!overview.views && !overview.leads ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-5 py-10 text-center">
          <p className="font-medium">Waiting for your first signal</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            Visits and intentional actions on your public profile will appear here. Analytics begins
            once someone opens your published profile.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
          <Panel className="sm:col-span-2 xl:col-span-6" title="Views and clicks">
            <Trend points={overview.trend} />
          </Panel>
          <Panel
            className="xl:col-span-3"
            subtitle="Share of all profile views"
            title="How people found you"
          >
            {acquisitionSegments.length ? (
              <Donut segments={acquisitionSegments} centerLabel="views" />
            ) : (
              <Empty>No acquisition data yet.</Empty>
            )}
          </Panel>
          <Panel className="xl:col-span-3" subtitle="Share of all profile views" title="Device mix">
            {deviceSegments.length ? (
              <Donut segments={deviceSegments} centerLabel="views" />
            ) : (
              <Empty>No device data yet.</Empty>
            )}
          </Panel>
          <Panel className="xl:col-span-2" title="Top destinations">
            <Ranked
              rows={overview.destinations.map((entry) => ({
                label: entry.label,
                value: entry.clicks,
                note: `${entry.type === 'content' ? 'Featured work' : 'Link'} · ${conversionRate(entry.clicks, overview.views)} of profile views`,
              }))}
              empty="No outbound clicks yet."
            />
          </Panel>
          <Panel className="xl:col-span-2" title="Top countries">
            <Ranked
              rows={overview.countries.map((entry) => ({
                label: countryName(entry.country),
                value: entry.views,
                note: entry.country,
              }))}
              empty="Country data will appear when Cloudflare provides it."
            />
          </Panel>
          <Panel className="xl:col-span-2" title="Intent signals">
            <Ranked
              rows={overview.interactions.map((entry) => ({
                label: interactionLabels[entry.type] ?? entry.type,
                value: entry.count,
                note: `${conversionRate(entry.count, overview.views)} of profile views`,
              }))}
              empty="No profile actions yet."
            />
          </Panel>
          <Panel className="xl:col-span-3" subtitle="Where messages came from" title="Lead sources">
            <Ranked
              rows={overview.leadSources.map((entry) => ({ label: entry.source, value: entry.leads }))}
              empty="No leads in this date range."
            />
          </Panel>
          <Panel className="xl:col-span-3" subtitle="Current state of leads received in this range" title="Lead outcomes">
            <Ranked
              rows={overview.leadStatuses.map((entry) => ({
                label: entry.status[0].toUpperCase() + entry.status.slice(1),
                value: entry.count,
              }))}
              empty="No leads in this date range."
            />
          </Panel>
          <Panel className="sm:col-span-2 xl:col-span-6" title="Campaign performance">
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
                        <td className="py-2.5 text-right">
                          <span
                            className="inline-block min-w-[52px] rounded-full px-2 py-0.5 text-center tabular-nums"
                            style={{ background: wash(3) }}
                          >
                            {campaign.views
                              ? Math.round((campaign.clicks / campaign.views) * 1000) / 10
                              : 0}
                            %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                Add a <code className="font-mono">utm_campaign</code> to see campaign performance.
              </Empty>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

/** A slot's hue at the wash opacity, composited onto the card it sits on. */
function wash(slot: ChartSlot) {
  return `color-mix(in srgb, ${chartSlotColor(slot)} calc(var(--chart-wash) * 100%), var(--card))`;
}

function Metric({
  icon: Icon,
  label,
  slot,
  value,
  current,
  previous,
  unit,
  series,
}: {
  icon: typeof Eye;
  label: string;
  slot: ChartSlot;
  value: string;
  current: number;
  /** Same measure over the preceding period of equal length. */
  previous: number | null;
  /** `points` compares two rates; the default compares two counts. */
  unit?: 'points';
  series?: number[];
}) {
  const color = chartSlotColor(slot);
  const change = previous
    ? unit === 'points'
      ? current - previous
      : percentChange(current, previous)
    : null;
  const Direction = change !== null && change < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-lg"
          style={{ background: wash(slot), color }}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      {previous ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
          <Direction
            aria-hidden="true"
            className="size-3.5 shrink-0"
            style={{
              color: change !== null && change < 0 ? 'var(--chart-down)' : 'var(--chart-up)',
            }}
          />
          <b
            className="font-semibold"
            style={{
              color: change !== null && change < 0 ? 'var(--chart-down)' : 'var(--chart-up)',
            }}
          >
            {formatChange(change, unit)}
          </b>
          <span className="min-w-0 truncate">
            vs {unit === 'points' ? `${round1(previous)}%` : previous.toLocaleString()} previous
          </span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No previous-period data</p>
      )}
      {series ? <Sparkline className="mt-2.5" points={series} slot={slot} /> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border/70 bg-card p-5 ${className}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/**
 * Ranked magnitude bars, one hue throughout. These lists are a single measure
 * sorted by size, so a hue per row would colour the rank rather than the thing
 * — every bar would repaint when the date range changes. Length carries the
 * number, and the number is printed beside it.
 */
function Ranked({
  rows,
  empty,
}: {
  rows: Array<{ label: string; value: number; note?: string }>;
  empty: string;
}) {
  if (!rows.length) return <Empty>{empty}</Empty>;
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
              className="h-full rounded-full"
              style={{ background: chartSlotColor(1), width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

const HEIGHT = 210;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
/** Width below which the chart is too cramped for four date labels. */
const NARROW = 420;

function Trend({ points }: { points: AnalyticsOverview['trend'] }) {
  const [containerRef, width] = useMeasuredWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const viewsColor = chartSlotColor(1);
  const clicksColor = chartSlotColor(2);
  const { max, ticks } = useMemo(() => axisFor(points), [points]);

  return (
    <>
      {/* Height is fixed here so the panel does not shift when the chart paints. */}
      <div className="relative h-[210px]" ref={containerRef}>
        {width ? (
          <TrendPlot
            activeIndex={activeIndex}
            clicksColor={clicksColor}
            max={max}
            onActiveIndexChange={setActiveIndex}
            points={points}
            ticks={ticks}
            viewsColor={viewsColor}
            width={width}
          />
        ) : null}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-[2px]" style={{ background: viewsColor }} />
          Profile views
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-[2px]" style={{ background: clicksColor }} />
          Outbound clicks
        </span>
      </div>
    </>
  );
}

/**
 * Drawn at 1:1 against the measured container width, so axis type stays 10px
 * and strokes stay 2px however wide the panel gets.
 */
function TrendPlot({
  activeIndex,
  clicksColor,
  max,
  onActiveIndexChange,
  points,
  ticks,
  viewsColor,
  width,
}: {
  activeIndex: number | null;
  clicksColor: string;
  max: number;
  onActiveIndexChange: (index: number | null) => void;
  points: AnalyticsOverview['trend'];
  ticks: number[];
  viewsColor: string;
  width: number;
}) {
  const last = points.length - 1;
  const plotWidth = width - PAD_LEFT - PAD_RIGHT;

  const pointX = (index: number) => PAD_LEFT + (index / Math.max(1, last)) * plotWidth;
  const pointY = (value: number) =>
    HEIGHT - PAD_BOTTOM - (value / max) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  const line = (key: 'views' | 'clicks') =>
    points
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'} ${pointX(index).toFixed(1)} ${pointY(point[key]).toFixed(1)}`,
      )
      .join(' ');
  const area = (key: 'views' | 'clicks') =>
    `${line(key)} L ${pointX(last).toFixed(1)} ${HEIGHT - PAD_BOTTOM} L ${pointX(0).toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z`;

  const dateLabels = (
    width < NARROW ? [0, last] : [0, Math.round(last / 3), Math.round((last * 2) / 3), last]
  ).filter((index, position, all) => all.indexOf(index) === position);
  const band = plotWidth / Math.max(1, last);
  const active = activeIndex === null ? null : points[activeIndex];

  return (
    <>
      <svg
        aria-label="Profile views and outbound clicks over time"
        className="block overflow-visible"
        height={HEIGHT}
        onMouseLeave={() => onActiveIndexChange(null)}
        role="img"
        width={width}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="stroke-border"
              strokeWidth="1"
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={pointY(tick)}
              y2={pointY(tick)}
            />
            <text
              className="fill-muted-foreground text-[10px]"
              textAnchor="end"
              x={PAD_LEFT - 8}
              y={pointY(tick) + 3.5}
            >
              {tick.toLocaleString()}
            </text>
          </g>
        ))}
        {dateLabels.map((index) => (
          <text
            className="fill-muted-foreground text-[10px]"
            key={points[index].date}
            textAnchor={index === 0 ? 'start' : index === last ? 'end' : 'middle'}
            x={pointX(index)}
            y={HEIGHT - PAD_BOTTOM + 15}
          >
            {formatAxisDate(points[index].date)}
          </text>
        ))}

        <path d={area('views')} fill={viewsColor} fillOpacity="var(--chart-tint)" />
        <path d={area('clicks')} fill={clicksColor} fillOpacity="var(--chart-tint)" />
        <path
          d={line('views')}
          fill="none"
          stroke={viewsColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d={line('clicks')}
          fill="none"
          stroke={clicksColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />

        <circle
          className="stroke-card"
          cx={pointX(last)}
          cy={pointY(points[last].views)}
          fill={viewsColor}
          r="4"
          strokeWidth="2"
        />
        <circle
          className="stroke-card"
          cx={pointX(last)}
          cy={pointY(points[last].clicks)}
          fill={clicksColor}
          r="4"
          strokeWidth="2"
        />

        {activeIndex !== null ? (
          <>
            <line
              stroke={viewsColor}
              strokeDasharray="3 3"
              strokeOpacity="0.45"
              x1={pointX(activeIndex)}
              x2={pointX(activeIndex)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
            />
            <circle
              className="stroke-card"
              cx={pointX(activeIndex)}
              cy={pointY(points[activeIndex].views)}
              fill={viewsColor}
              r="4.5"
              strokeWidth="2"
            />
            <circle
              className="stroke-card"
              cx={pointX(activeIndex)}
              cy={pointY(points[activeIndex].clicks)}
              fill={clicksColor}
              r="4.5"
              strokeWidth="2"
            />
          </>
        ) : null}

        {points.map((point, index) => (
          <rect
            aria-label={`${formatTrendDate(point.date)}: ${point.views} views, ${point.clicks} outbound clicks`}
            fill="transparent"
            height={HEIGHT}
            key={point.date}
            onFocus={() => onActiveIndexChange(index)}
            onMouseMove={() => onActiveIndexChange(index)}
            tabIndex={0}
            width={band}
            x={pointX(index) - band / 2}
            y="0"
          />
        ))}
      </svg>
      {active && activeIndex !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
          style={tooltipPosition(pointX(activeIndex), width)}
        >
          <p className="font-medium text-foreground">{formatTrendDate(active.date)}</p>
          <p className="mt-1 flex items-center gap-1.5 tabular-nums text-muted-foreground">
            <i className="size-2 shrink-0 rounded-[2px]" style={{ background: viewsColor }} />
            {active.views.toLocaleString()} views
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 tabular-nums text-muted-foreground">
            <i className="size-2 shrink-0 rounded-[2px]" style={{ background: clicksColor }} />
            {active.clicks.toLocaleString()} clicks
          </p>
        </div>
      ) : null}
    </>
  );
}

/**
 * Keep the tooltip inside the panel: centred over the point normally, and
 * anchored to whichever edge it would otherwise overflow.
 */
function tooltipPosition(x: number, width: number) {
  const HALF = 90;
  if (x < HALF) return { left: 0, transform: 'none' };
  if (x > width - HALF) return { right: 0, transform: 'none' };
  return { left: x, transform: 'translateX(-50%)' };
}

/** Round the scale up so every gridline lands on a value worth printing. */
function axisFor(points: AnalyticsOverview['trend']) {
  const peak = Math.max(1, ...points.flatMap((point) => [point.views, point.clicks]));
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const step = [1, 2, 2.5, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => peak / candidate <= 4)!;
  const max = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  return { max, ticks };
}

function percentChange(current: number, previous: number) {
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatChange(change: number | null, unit?: 'points') {
  if (change === null) return '—';
  const sign = change < 0 ? '−' : '+';
  const size = Math.abs(round1(change));
  return unit === 'points' ? `${sign}${size} pts` : `${sign}${size}%`;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function formatAxisDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
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
