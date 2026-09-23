import { cn } from '@ownlane/ui/lib/utils';
import { chartSlotColor, type ChartSlot } from '@ownlane/ui/lib/chart';

/**
 * Shape-only trend line for a stat tile. It carries no axis and no values, so
 * it shows direction, not magnitude — the tile's own figure is the number.
 * It is decorative next to that figure, hence aria-hidden.
 */
export function Sparkline({
  points,
  slot,
  className,
}: {
  points: number[];
  slot: ChartSlot;
  className?: string;
}) {
  if (points.length < 2) return null;

  const low = Math.min(...points);
  const high = Math.max(...points);
  const span = high - low || 1;
  const line = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 120;
      const y = 24 - ((value - low) / span) * 22;
      return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const color = chartSlotColor(slot);

  return (
    <svg
      aria-hidden="true"
      className={cn('h-6.5 w-full', className)}
      preserveAspectRatio="none"
      viewBox="0 0 120 26"
    >
      <path d={`${line} L 120 26 L 0 26 Z`} fill={color} fillOpacity="var(--chart-tint)" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
