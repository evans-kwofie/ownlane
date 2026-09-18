import { useEffect, useRef, useState } from 'react';
import { Input } from '@ownlane/ui/components/input';
import { Textarea } from '@ownlane/ui/components/textarea';
import { cn } from '@ownlane/ui/lib/utils';

type EditableRowProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires on every keystroke, for anything mirroring the field live. */
  onPreview?: (value: string) => void;
  maxLength: number;
  kind?: 'text' | 'textarea';
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Shown instead of the raw value when there is one, e.g. capitalised. */
  display?: string;
  /** Marks the row as changed but not yet saved. */
  dirty?: boolean;
  /** Shown at the end of the row, e.g. whether this detail is published. */
  trailing?: React.ReactNode;
};

/**
 * One row of a record, edited where it sits. Changes are held by the page, not
 * written here — the save bar commits them together, so a profile is never
 * published half-edited.
 */
export function EditableRow({
  name,
  label,
  value,
  onChange,
  onPreview,
  maxLength,
  kind = 'text',
  placeholder,
  hint,
  error,
  display,
  dirty,
  trailing,
}: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    onPreview?.(draft);
    if (draft !== value) onChange(draft);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    onPreview?.(value);
  }

  function type(next: string) {
    setDraft(next);
    onPreview?.(next);
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-6 px-5 py-3">
        <span className="w-[104px] shrink-0 pt-1 text-[13px] text-muted-foreground">{label}</span>
        <button
          className={cn(
            'min-w-0 flex-1 rounded-md px-2 py-1 text-left text-[13.5px] transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [overflow-wrap:anywhere]',
            kind === 'textarea' && 'whitespace-pre-line',
            error && 'ring-1 ring-destructive/50',
          )}
          onClick={() => setEditing(true)}
          type="button"
        >
          {value ? (
            (display ?? value)
          ) : (
            <span className="text-muted-foreground/60">Add {label.toLowerCase()}</span>
          )}
        </button>
        {trailing ? <div className="shrink-0 pt-0.5">{trailing}</div> : null}
        {dirty ? (
          <span
            aria-label="Unsaved"
            className="mt-2 size-1.5 shrink-0 rounded-full bg-ownlane-orange"
            title="Unsaved change"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 bg-accent/30 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[13px] font-medium text-foreground/80" htmlFor={name}>
          {label}
        </label>
        <span className="font-mono text-[11px] text-muted-foreground/70">
          {draft.length}/{maxLength}
        </span>
      </div>

      {kind === 'textarea' ? (
        <Textarea
          className="min-h-24 bg-background text-[14px]"
          id={name}
          maxLength={maxLength}
          onBlur={commit}
          onChange={(event) => type(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') cancel();
          }}
          placeholder={placeholder}
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={draft}
        />
      ) : (
        <Input
          className="h-10 bg-background text-[14px]"
          id={name}
          maxLength={maxLength}
          onBlur={commit}
          onChange={(event) => type(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') cancel();
          }}
          placeholder={placeholder}
          ref={inputRef as React.Ref<HTMLInputElement>}
          value={draft}
        />
      )}

      {error ? (
        <p className="text-[12.5px] text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
