import { Tooltip, TooltipContent, TooltipTrigger } from '@ownlane/ui/components/tooltip';
import { toCapitalised } from '@ownlane/ui/lib/text';

type IdentityCardProps = {
  name: string;
  tagline: string;
  bio: string;
  profession: string;
  pronouns: string;
  /** The workspace slug, which is also the public address. */
  slug: string;
  visibility?: string;
  /** Rendered inside an existing card, so it draws no border of its own. */
  embedded?: boolean;
};

/**
 * The record as a thing rather than a form: what this identity looks like
 * before you start editing its parts. Long text is trimmed here and shown in
 * full on hover — the card is a glance, not the document.
 */
export function IdentityCard({
  name,
  tagline,
  bio,
  profession,
  pronouns,
  slug,
  visibility,
  embedded,
}: IdentityCardProps) {
  const meta = [profession, pronouns].filter(Boolean).join(' · ');

  return (
    <div
      className={
        embedded
          ? 'min-w-0 flex-1'
          : 'flex items-start gap-4 rounded-lg border border-border/70 bg-card p-4 sm:p-5'
      }
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[17px] font-medium tracking-[-0.02em]">
            {name ? toCapitalised(name) : 'Unnamed identity'}
          </p>
          {visibility ? (
            <span
              className={
                visibility === 'public'
                  ? 'rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive'
                  : 'rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground'
              }
            >
              {visibility === 'public' ? 'Public' : 'Private'}
            </span>
          ) : null}
        </div>

        {meta ? (
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground/80">{meta}</p>
        ) : null}

        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {tagline || 'No tagline yet'}
        </p>

        {bio ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="mt-2 max-w-full cursor-default truncate border-l-2 border-border pl-2.5 text-left text-[12.5px] text-muted-foreground/80">
                {bio}
              </p>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-[320px] whitespace-pre-line text-[12.5px] leading-relaxed"
              side="bottom"
            >
              {bio}
            </TooltipContent>
          </Tooltip>
        ) : null}

        <p className="mt-2.5 truncate font-mono text-[11.5px] text-muted-foreground/70">
          ownlane.com/{slug}
        </p>
      </div>
    </div>
  );
}
