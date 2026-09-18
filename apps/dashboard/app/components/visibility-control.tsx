import { Alert02Icon, LockedIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@ownlane/ui/lib/utils';

type VisibilityControlProps = {
  value: string;
  onRequestChange: () => void;
  dirty?: boolean;
};

/**
 * Publishing an identity is the one change on this page that reaches beyond
 * Ownlane, so it is stated rather than tucked into a dropdown: the public state
 * carries the warning colour and says exactly what becomes visible.
 */
export function VisibilityControl({ value, onRequestChange, dirty }: VisibilityControlProps) {
  const isPublic = value === 'public';

  return (
    <div
      className={cn(
        'space-y-3 px-5 py-4 transition-colors',
        isPublic && 'bg-destructive/5',
        dirty && 'ring-1 ring-inset ring-ownlane-orange/40',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13.5px] font-medium">
            <HugeiconsIcon
              className={isPublic ? 'text-destructive' : 'text-muted-foreground'}
              icon={isPublic ? Alert02Icon : LockedIcon}
              size={15}
              strokeWidth={1.5}
            />
            Profile visibility
          </p>
          <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">
            {isPublic
              ? 'Anyone with the address can read this profile — its bios, links, and every contact detail you have published. Search engines can index it.'
              : 'Nothing is published. Only people in this workspace can see this profile, and its images stay behind a sign-in.'}
          </p>
        </div>

        <span
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium',
            isPublic
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      <div>
        <button
          className={cn(
            'rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            isPublic
              ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
              : 'border-border text-muted-foreground hover:bg-accent/60',
          )}
          onClick={onRequestChange}
          type="button"
        >
          {isPublic ? 'Make private' : 'Make public'}
        </button>
      </div>

      {dirty ? (
        <p className="text-[12px] font-medium text-ownlane-orange">
          {isPublic
            ? 'This profile becomes public when you save.'
            : 'This profile stops being public when you save.'}
        </p>
      ) : null}
    </div>
  );
}
