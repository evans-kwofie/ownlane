import { useState } from 'react';
import { Calendar03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { useFetcher } from 'react-router';

import { fieldLabel } from './profile-history';
import type { ProfileField } from '../lib/profiles';

type ScheduleChangeProps = {
  /** The pending edits, offered as the thing to schedule. */
  changes: Partial<Record<ProfileField, string>>;
  onScheduled: () => void;
};

/**
 * Sends the current unsaved edits to a date instead of applying them now. The
 * conflict choice is the caller's: a rename planned for launch day may or may
 * not deserve to overwrite something edited in the meantime.
 */
export function ScheduleChange({ changes, onScheduled }: ScheduleChangeProps) {
  const fetcher = useFetcher<{ scheduledAt?: string }>();
  const [open, setOpen] = useState(false);
  const [applyAt, setApplyAt] = useState('');
  const [strategy, setStrategy] = useState<'overwrite' | 'skip_edited'>('overwrite');

  const fields = Object.keys(changes) as ProfileField[];
  const pending = fetcher.state !== 'idle';

  function submit() {
    if (!applyAt) return;

    const form = new FormData();
    form.append('intent', 'schedule');
    // A local datetime picked by a person; stored as an instant.
    form.append('applyAt', new Date(applyAt).toISOString());
    form.append('conflictStrategy', strategy);
    form.append('changes', JSON.stringify(changes));

    fetcher.submit(form, { method: 'post' });
    setOpen(false);
    onScheduled();
  }

  return (
    <>
      <Button
        className="h-8 gap-1.5 border-background/30 bg-transparent text-[13px] text-background hover:bg-background/10 hover:text-background"
        disabled={!fields.length}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Calendar03Icon} size={14} strokeWidth={1.5} />
        Schedule
      </Button>

      <FormSheet
        description="These edits are held until the date you choose, then applied automatically."
        footer={
          <>
            <Button
              className="h-9 text-[13.5px]"
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-9 bg-foreground text-[13.5px] text-background hover:bg-foreground/90"
              disabled={!applyAt || pending}
              onClick={submit}
              type="button"
            >
              Schedule change
            </Button>
          </>
        }
        onOpenChange={setOpen}
        open={open}
        title="Schedule these changes"
      >
        <div className="space-y-4 pb-1">
          <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2.5 text-[12.5px] text-muted-foreground">
            {fields.length} field{fields.length === 1 ? '' : 's'}:{' '}
            {fields.map(fieldLabel).join(', ')}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="applyAt">
              Apply on
            </Label>
            <Input
              className="h-10 text-[14px]"
              id="applyAt"
              min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
              onChange={(event) => setApplyAt(event.target.value)}
              type="datetime-local"
              value={applyAt}
            />
            <p className="text-[12px] text-muted-foreground">
              Your local time. Changes are checked every five minutes.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="pb-1 text-[13px] font-medium text-foreground/80">
              If a field is edited before then
            </legend>
            {(
              [
                [
                  'overwrite',
                  'Apply anyway',
                  'The scheduled value wins, even if the field changed in the meantime.',
                ],
                [
                  'skip_edited',
                  'Leave newer edits alone',
                  'Fields changed since scheduling keep their newer value.',
                ],
              ] as const
            ).map(([value, title, description]) => (
              <label
                className="flex cursor-pointer gap-2.5 rounded-md border border-border/70 px-3 py-2.5 has-[:checked]:border-foreground/40 has-[:checked]:bg-accent/40"
                key={value}
              >
                <input
                  checked={strategy === value}
                  className="mt-0.5 accent-ownlane-orange"
                  name="conflictStrategy"
                  onChange={() => setStrategy(value)}
                  type="radio"
                  value={value}
                />
                <span>
                  <span className="block text-[13px] font-medium">{title}</span>
                  <span className="block text-[12.5px] leading-relaxed text-muted-foreground">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </FormSheet>
    </>
  );
}
