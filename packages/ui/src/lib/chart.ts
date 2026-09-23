/**
 * Chart colour slots.
 *
 * A slot belongs to an entity, not to a position in a sorted list. Assign
 * slots from a stable key (device type, interaction type) so changing a date
 * range never repaints the series that survive the filter. `rest` is the
 * grey remainder bucket — it is deliberately not a hue, so an "Other" segment
 * never reads as one more entity.
 */
export type ChartSlot = 1 | 2 | 3 | 4 | 5 | 'rest';

export const CHART_SLOTS = [1, 2, 3, 4, 5] as const satisfies readonly ChartSlot[];

/** The CSS value for a slot, resolved from the theme tokens at paint time. */
export function chartSlotColor(slot: ChartSlot) {
  return slot === 'rest' ? 'var(--chart-rest)' : `var(--chart-${slot})`;
}

/**
 * Assign slots to a fixed list of keys, in the order given. Callers pass a
 * domain's full key list — not the rows returned for one date range — so the
 * mapping is stable across filters. Keys past the fifth fall back to `rest`.
 */
export function chartSlotsFor<Key extends string>(keys: readonly Key[]): Record<Key, ChartSlot> {
  return Object.fromEntries(
    keys.map((key, index) => [key, (CHART_SLOTS[index] ?? 'rest') as ChartSlot]),
  ) as Record<Key, ChartSlot>;
}

/** Share of a total, rounded for display: one decimal below 10%, whole above. */
export function sharePercent(value: number, total: number) {
  if (!total) return '0%';
  const share = (value / total) * 100;
  return `${share >= 10 ? Math.round(share) : Math.round(share * 10) / 10}%`;
}
