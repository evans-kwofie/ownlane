import { useState } from 'react';
import { ArrowUpRightIcon, ChevronDownIcon } from 'lucide-react';

import { cn } from '@ownlane/ui/lib/utils';

import type {
  HandleCoverage,
  HandleCoverageRow,
} from '../../../features/connections/handle-queries.server';

/**
 * Where this identity's handle stands across the platforms that publish handles
 * as public URLs.
 *
 * It states one fact per platform — whether the address resolves, and whether it
 * resolves to a connected account. It is not impersonation detection: who holds
 * a handle, and why, is not something a URL can answer, and a wrong guess here
 * would be an accusation against a real person.
 */
const STATE_STYLE: Record<
  HandleCoverageRow['state'],
  { label: string; color: string; note: string }
> = {
  yours: { label: 'Yours', color: 'var(--chart-up)', note: 'Connected to this identity.' },
  available: {
    label: 'Free',
    color: 'var(--chart-2)',
    note: 'Nobody holds it. Worth claiming before somebody does.',
  },
  taken: {
    label: 'Someone else',
    color: 'var(--chart-warn)',
    note: 'The address resolves, but not to an account you have connected.',
  },
  unverifiable: {
    label: 'Could not check',
    color: 'var(--chart-rest)',
    note: 'The platform refused to answer. No conclusion either way.',
  },
  unknown: { label: 'Not checked', color: 'var(--chart-rest)', note: 'Checked weekly.' },
};

export function HandleCoveragePanel({ coverage }: { coverage: HandleCoverage }) {
  const [open, setOpen] = useState(false);

  if (!coverage.handle) {
    return (
      <section className="mb-6 rounded-xl border border-dashed border-border px-5 py-6 text-center">
        <p className="text-[14px] font-medium">No handle chosen yet</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
          Pick a handle on your profile and Ownlane will tell you where it is still free to claim.
        </p>
      </section>
    );
  }

  const { counts } = coverage;
  const notable = coverage.rows.filter((row) => row.state === 'available' || row.state === 'taken');

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border/70 bg-card">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">@{coverage.handle} across the internet</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {counts.yours} yours · {counts.available} free to claim · {counts.taken} held by someone
            else
            {counts.unverifiable ? ` · ${counts.unverifiable} could not be checked` : ''}
          </p>
        </div>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Collapsed, the notable rows still show — the free and the taken are the
          only two states anyone acts on. */}
      {!open && notable.length ? (
        <ul className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3">
          {notable.slice(0, 8).map((row) => (
            <li
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px]"
              key={row.provider}
            >
              <i
                aria-hidden="true"
                className="size-1.5 rounded-full"
                style={{ background: STATE_STYLE[row.state].color }}
              />
              {row.name}
              <span className="text-muted-foreground">{STATE_STYLE[row.state].label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <ul className="divide-y divide-border border-t border-border">
          {coverage.rows.map((row) => {
            const style = STATE_STYLE[row.state];
            return (
              <li className="flex items-center gap-3 px-4 py-2.5" key={row.provider}>
                <i
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: style.color }}
                />
                <span className="w-28 shrink-0 truncate text-[13.5px]">{row.name}</span>
                <span className="w-[108px] shrink-0 text-[12.5px] font-medium">{style.label}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                  {style.note}
                </span>
                {/* Only the free ones get an outward link. Pointing someone at a
                    stranger's profile would invite a confrontation this feature
                    exists to avoid. */}
                {row.state === 'available' && row.origin ? (
                  <a
                    className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    href={row.origin}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Claim
                    <ArrowUpRightIcon aria-hidden="true" className="size-3" />
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
