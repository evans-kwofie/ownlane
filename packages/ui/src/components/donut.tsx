import * as React from 'react';
import { cn } from '@ownlane/ui/lib/utils';
import { chartSlotColor, sharePercent, type ChartSlot } from '@ownlane/ui/lib/chart';

export type DonutSegment = {
  /** Stable key. Drives the slot, so it must not depend on sort position. */
  id: string;
  label: string;
  value: number;
  slot: ChartSlot;
};

const RADIUS = 64;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Card-coloured gap between segments, in path units. */
const GAP = 3;

/**
 * A part-to-whole ring.
 *
 * Only use this where the segments genuinely sum to the stated whole — every
 * visit has exactly one device type, so device mix qualifies; counts of
 * different actions do not, because one visitor can trigger several. Where
 * the source query is a top-N, pass a `rest` segment for the remainder so the
 * ring is not claiming the top N is everything.
 *
 * Every segment is also listed with its value and share beneath the ring, so
 * colour is never the only way to read it.
 */
export function Donut({
  segments,
  centerLabel,
  className,
}: {
  segments: DonutSegment[];
  /** Unit named under the total in the middle, e.g. "views". */
  centerLabel: string;
  className?: string;
}) {
  const [active, setActive] = React.useState<string | null>(null);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const arcs = React.useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const length = total ? (segment.value / total) * CIRCUMFERENCE : 0;
      const drawn = Math.max(0.6, length - GAP);
      const arc = { segment, drawn, offset };
      offset += length;
      return arc;
    });
  }, [segments, total]);

  if (!total) return null;

  const activeSegment = segments.find((segment) => segment.id === active) ?? null;

  const description = segments
    .map((segment) => `${segment.label} ${segment.value} (${sharePercent(segment.value, total)})`)
    .join(', ');

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative aspect-square w-full max-w-[210px]">
        <svg
          aria-label={`${total.toLocaleString()} ${centerLabel}: ${description}`}
          className="size-full"
          role="img"
          viewBox="0 0 160 160"
        >
          {/* Track, so a very small segment still reads as a sliver of a whole. */}
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            className="stroke-muted"
            fill="none"
            strokeWidth={STROKE}
          />
          {arcs.map(({ segment, drawn, offset }) => (
            <circle
              key={segment.id}
              className={cn(
                'transition-opacity duration-150',
                active && active !== segment.id && 'opacity-30',
              )}
              cx="80"
              cy="80"
              fill="none"
              onMouseEnter={() => setActive(segment.id)}
              onMouseLeave={() => setActive(null)}
              r={RADIUS}
              stroke={chartSlotColor(segment.slot)}
              strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
              strokeDashoffset={-offset}
              strokeWidth={STROKE}
              transform="rotate(-90 80 80)"
            />
          ))}
        </svg>
        {/*
          The hole is the readout. Hovering an arc — or its row in the key —
          swaps the total for that segment's own figure, so a hovered slice
          always says what it is without a tooltip chasing the cursor.
          The padding keeps the text inside the ring's inner edge.
        */}
        <div className="pointer-events-none absolute inset-0 grid place-content-center px-[22%] text-center">
          <p className="text-2xl font-semibold tracking-[-0.035em] tabular-nums">
            {(activeSegment?.value ?? total).toLocaleString()}
          </p>
          {activeSegment ? (
            <>
              <p className="mt-1 flex w-full items-center justify-center gap-1.5 text-[11px] leading-tight">
                <i
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: chartSlotColor(activeSegment.slot) }}
                />
                <span className="min-w-0 truncate">{activeSegment.label}</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                {sharePercent(activeSegment.value, total)} of {centerLabel}
              </p>
            </>
          ) : (
            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">
              {centerLabel}
            </p>
          )}
        </div>
      </div>
      <ul className="mt-3.5 w-full">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className={cn(
              '-mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm transition-colors',
              active === segment.id && 'bg-muted',
            )}
            onMouseEnter={() => setActive(segment.id)}
            onMouseLeave={() => setActive(null)}
          >
            <i
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: chartSlotColor(segment.slot) }}
            />
            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
            <span className="shrink-0 tabular-nums">{segment.value.toLocaleString()}</span>
            <span className="w-11 shrink-0 text-right tabular-nums text-muted-foreground">
              {sharePercent(segment.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
