import { LEAD_STATUS_LABELS, type LeadStatus } from '../../../features/audience/schema';

/**
 * Status colours are a fixed, stable set keyed by the status itself, so a
 * filter never reshuffles them. The label is always present — colour never
 * carries the meaning alone.
 */
const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'var(--chart-2)',
  replied: 'var(--chart-4)',
  won: 'var(--chart-up)',
  archived: 'var(--chart-rest)',
  spam: 'var(--chart-down)',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-0.5 pl-1.5 pr-2.5 text-xs font-medium">
      <i
        aria-hidden="true"
        className="size-[7px] rounded-full"
        style={{ background: STATUS_COLORS[status] }}
      />
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
