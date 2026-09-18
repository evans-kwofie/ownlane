import { useState } from 'react';
import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Textarea } from '@ownlane/ui/components/textarea';
import { useFetcher } from 'react-router';

type Entry = { id: string; primary: string; secondary?: string; href?: string };

type EntryListProps = {
  entries: Entry[];
  /** Posted as `intent`, e.g. add-credibility. */
  addIntent: string;
  removeIntent: string;
  /** Extra hidden values the add form needs, such as the credibility kind. */
  hidden?: Record<string, string>;
  fields: { name: string; placeholder: string; required?: boolean; kind?: 'text' | 'textarea' }[];
  emptyText: string;
  addLabel: string;
};

/**
 * A list that grows: credentials, affiliations, services. Each row is its own
 * record, so adding and removing save immediately rather than joining the
 * profile's pending changes.
 */
export function EntryList({
  entries,
  addIntent,
  removeIntent,
  hidden = {},
  fields,
  emptyText,
  addLabel,
}: EntryListProps) {
  const fetcher = useFetcher();
  const [adding, setAdding] = useState(false);
  const pending = fetcher.state !== 'idle';

  return (
    <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-card">
      {entries.length ? (
        entries.map((entry) => (
          <div className="flex items-start justify-between gap-4 px-5 py-3" key={entry.id}>
            <div className="min-w-0">
              <p className="truncate text-[13.5px]">{entry.primary}</p>
              {entry.secondary ? (
                <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
                  {entry.secondary}
                </p>
              ) : null}
              {entry.href ? (
                <a
                  className="truncate font-mono text-[11.5px] text-muted-foreground/80 underline underline-offset-2"
                  href={entry.href}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {entry.href}
                </a>
              ) : null}
            </div>
            <fetcher.Form method="post">
              <input name="intent" type="hidden" value={removeIntent} />
              <input name="entryId" type="hidden" value={entry.id} />
              <Button aria-label="Remove" className="size-7 p-0" type="submit" variant="ghost">
                <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} />
              </Button>
            </fetcher.Form>
          </div>
        ))
      ) : (
        <p className="px-5 py-4 text-[13px] text-muted-foreground/70">{emptyText}</p>
      )}

      {adding ? (
        <fetcher.Form
          className="space-y-2 bg-accent/30 px-5 py-4"
          method="post"
          onSubmit={() => setAdding(false)}
        >
          <input name="intent" type="hidden" value={addIntent} />
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          {fields.map((field) =>
            field.kind === 'textarea' ? (
              <Textarea
                className="min-h-20 bg-background text-[13.5px]"
                key={field.name}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : (
              <Input
                autoFocus={field === fields[0]}
                className="h-9 bg-background text-[13.5px]"
                key={field.name}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
              />
            ),
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="h-8 text-[13px]"
              onClick={() => setAdding(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="h-8 bg-foreground text-[13px] text-background hover:bg-foreground/90"
              disabled={pending}
              type="submit"
            >
              Add
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <button
          className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          onClick={() => setAdding(true)}
          type="button"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
          {addLabel}
        </button>
      )}
    </div>
  );
}
