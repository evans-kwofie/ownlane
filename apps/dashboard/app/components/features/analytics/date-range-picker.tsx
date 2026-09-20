import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@ownlane/ui/components/button';
import type { AnalyticsDateRange } from '../../../features/analytics/schema';

type Props = { value: AnalyticsDateRange; onApply: (range: AnalyticsDateRange) => void };

export function DateRangePicker({ value, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(() => monthFrom(value.end));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function select(date: string) {
    if (!draft.start || draft.end) return setDraft({ start: date, end: '' });
    setDraft(
      date < draft.start ? { start: date, end: draft.start } : { start: draft.start, end: date },
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button onClick={() => setOpen((current) => !current)} size="sm" variant="outline">
        <CalendarDays className="size-4" /> {label(value)}
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(680px,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Custom date range</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Select a start date, then an end date.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                aria-label="Previous month"
                onClick={() => setMonth(addMonths(month, -1))}
                size="icon-xs"
                variant="ghost"
              >
                <ChevronLeft />
              </Button>
              <Button
                aria-label="Next month"
                onClick={() => setMonth(addMonths(month, 1))}
                size="icon-xs"
                variant="ghost"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Month month={month} range={draft} onSelect={select} />
            <Month month={addMonths(month, 1)} range={draft} onSelect={select} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              {draft.end ? label(draft) : 'Choose an end date'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(value)} size="sm" variant="ghost">
                Reset
              </Button>
              <Button
                disabled={!draft.start || !draft.end}
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
                size="sm"
              >
                Apply range
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Month({
  month,
  range,
  onSelect,
}: {
  month: Date;
  range: AnalyticsDateRange;
  onSelect: (date: string) => void;
}) {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium">
        {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <span className="py-1" key={`${day}-${i}`}>
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => (
          <Day
            date={date}
            dim={date.slice(0, 7) !== formatMonth(month)}
            key={date}
            range={range}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function Day({
  date,
  dim,
  range,
  onSelect,
}: {
  date: string;
  dim: boolean;
  range: AnalyticsDateRange;
  onSelect: (date: string) => void;
}) {
  const selected = date === range.start || date === range.end;
  const within = !!range.end && date > range.start && date < range.end;
  return (
    <button
      className={`relative h-8 text-xs transition-colors ${dim ? 'text-muted-foreground/45' : 'text-foreground'} ${within ? 'bg-primary/10' : ''} ${selected ? 'z-10 rounded-md bg-primary font-semibold text-primary-foreground' : 'hover:bg-accent'}`}
      onClick={() => onSelect(date)}
      type="button"
    >
      {Number(date.slice(-2))}
    </button>
  );
}

function formatMonth(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function monthFrom(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}
function addMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}
function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
}
function label(range: AnalyticsDateRange) {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  };
  return `${new Date(`${range.start}T00:00:00Z`).toLocaleDateString('en-US', options)} – ${new Date(`${range.end}T00:00:00Z`).toLocaleDateString('en-US', options)}`;
}
