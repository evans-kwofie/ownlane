import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';

type AuthShellProps = {
  children: React.ReactNode;
  /** Headline for the step. Sentence case, a few words. */
  title: string;
  /** One quiet sentence under the headline. */
  description?: React.ReactNode;
  /** Small print under the card: legal copy, or a link to another step. */
  footnote?: React.ReactNode;
};

/**
 * Shared frame for every auth screen (sign in, verification, invites, recovery).
 * Pages supply only their form; the mark, card and spacing live here so each step
 * feels like the same quiet room.
 */
export function AuthShell({ children, title, description, footnote }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-5 py-10 text-foreground">
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] sm:p-8">
          <OwnlaneMark className="size-7 text-ownlane-orange" variant="open" />

          <h1 className="mt-6 text-[22px] font-medium leading-tight tracking-[-0.02em]">{title}</h1>
          {description ? (
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}

          <div className="mt-7">{children}</div>
        </div>

        {footnote ? (
          <div className="mt-5 px-1 text-center text-[12.5px] leading-relaxed text-muted-foreground">
            {footnote}
          </div>
        ) : null}
      </div>
    </main>
  );
}
