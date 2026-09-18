import { Button } from '@ownlane/ui/components/button';

import { ScheduleChange } from './schedule-change';
import type { ProfileField } from '../lib/profiles';

type SaveBarProps = {
  count: number;
  /** The pending edits, offered to the scheduler as-is. */
  changes: Partial<Record<ProfileField, string>>;
  pending: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

/** One decision for the whole record, shown only once something has changed. */
export function SaveBar({ count, changes, pending, onDiscard, onSave }: SaveBarProps) {
  if (!count) return null;

  return (
    <div className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-foreground px-4 py-2.5 text-background shadow-lg">
      <p className="text-[13px]">
        {count} unsaved {count === 1 ? 'change' : 'changes'}
      </p>
      <div className="flex flex-wrap gap-2">
        <ScheduleChange changes={changes} onScheduled={onDiscard} />
        <Button
          className="h-8 border-background/30 bg-transparent text-[13px] text-background hover:bg-background/10 hover:text-background"
          disabled={pending}
          onClick={onDiscard}
          type="button"
          variant="outline"
        >
          Discard
        </Button>
        <Button
          className="h-8 bg-background text-[13px] text-foreground hover:bg-background/90"
          disabled={pending}
          onClick={onSave}
          type="button"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
