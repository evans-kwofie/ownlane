import { cn } from '@ownlane/ui/lib/utils';

type SpinnerProps = {
  className?: string;
  /** Announced to screen readers; the visible label usually sits beside it. */
  label?: string;
};

/**
 * A quiet arc spinner. Takes its colour from `currentColor` and its size from
 * the class it is given, so it fits wherever it is dropped.
 */
export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span className={cn('inline-block size-5 text-muted-foreground', className)} role="status">
      <svg className="size-full animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="2.5"
        />
        <path
          d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
