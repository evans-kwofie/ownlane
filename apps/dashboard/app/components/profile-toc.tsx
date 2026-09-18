import { useEffect, useState } from 'react';

import { cn } from '@ownlane/ui/lib/utils';

export type TocEntry = { id: string; label: string };

/** Longer headings get longer rules, so the stack reads as abstracted text. */
function ruleWidth(label: string) {
  return Math.min(30, Math.max(12, Math.round(label.length * 1.9)));
}

/**
 * A profile grows as fields are filled in, so the page needs a way to skip
 * rather than scroll. At rest it is a stack of rules — a shape of the page,
 * not a menu — and it opens into labels when pointed at. The marked rule
 * follows the section being read.
 */
export function ProfileToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState(entries[0]?.id ?? '');

  useEffect(() => {
    if (!entries.length) return;

    const sections = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((node): node is HTMLElement => node !== null);

    // The band sits across the middle of the viewport, so a section counts as
    // current while it is being read rather than when it first appears.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav
      aria-label="On this profile"
      className="group fixed top-1/2 hidden -translate-y-1/2 py-4 xl:block"
      style={{ left: 'max(20px, calc(50% - 30rem))' }}
    >
      <ul className="flex flex-col items-start gap-2.5">
        {entries.map((entry) => {
          const current = active === entry.id;

          return (
            <li className="flex" key={entry.id}>
              <a
                aria-current={current ? 'true' : undefined}
                className="flex items-center gap-3 outline-none"
                href={`#${entry.id}`}
              >
                <span
                  className={cn(
                    'h-px shrink-0 rounded-full transition-all duration-300 ease-out',
                    current ? 'bg-foreground' : 'bg-foreground/25 group-hover:bg-foreground/40',
                  )}
                  style={{ width: current ? 34 : ruleWidth(entry.label) }}
                />
                <span
                  className={cn(
                    'whitespace-nowrap text-[12.5px] transition-all duration-300 ease-out',
                    'translate-x-[-6px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                    'group-focus-within:translate-x-0 group-focus-within:opacity-100',
                    current ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {entry.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
