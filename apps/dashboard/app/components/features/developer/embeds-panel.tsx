import { useState } from 'react';
import { CopyIcon } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { toast } from '@ownlane/ui/components/sonner';
import { cn } from '@ownlane/ui/lib/utils';

import { useWorkspacePath } from '../../../lib/workspaces';

const WIDGETS = [
  { id: 'contact', label: 'Contact form', detail: 'Your real form, on your own site.' },
  { id: 'card', label: 'Profile card', detail: 'Name, photo and bio, linking to your profile.' },
] as const;

const THEMES = ['auto', 'light', 'dark'] as const;

/**
 * Snippets a customer pastes into their own site.
 *
 * The embed renders in a sandboxed iframe rather than injecting markup: the
 * host page's CSS cannot break a form collecting someone's contact details, and
 * the widget cannot read the host's cookies or DOM. It also means the embedded
 * contact form is the same component as the one on the public profile, so the
 * two can never drift.
 */
export function EmbedsPanel({
  contactFormEnabled,
  isPublic,
  origin,
  slug,
}: {
  contactFormEnabled: boolean;
  isPublic: boolean;
  origin: string;
  slug: string;
}) {
  const [widget, setWidget] = useState<(typeof WIDGETS)[number]['id']>('contact');
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('auto');
  const workspacePath = useWorkspacePath();

  const snippet = `<script src="${origin}/embed.js" data-ownlane="${slug}" data-widget="${widget}"${
    theme === 'auto' ? '' : ` data-theme="${theme}"`
  } async></script>`;

  return (
    <div className="space-y-6">
      {!isPublic ? (
        <p
          className="rounded-lg border px-3.5 py-2.5 text-[13px]"
          style={{
            borderColor: 'color-mix(in srgb, var(--chart-warn) 45%, transparent)',
            background: 'color-mix(in srgb, var(--chart-warn) 12%, var(--card))',
          }}
        >
          Your profile is not published, so an embed will show nothing. Publish it first.
        </p>
      ) : null}

      <section className="space-y-3">
        <p className="text-[14px] font-medium">What to embed</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WIDGETS.map((option) => (
            <button
              className={cn(
                'rounded-xl border border-border px-4 py-3 text-left transition-colors',
                widget === option.id ? 'border-primary bg-card' : 'hover:bg-muted',
              )}
              key={option.id}
              onClick={() => setWidget(option.id)}
              type="button"
            >
              <span className="block text-[13.5px] font-medium">{option.label}</span>
              <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                {option.detail}
              </span>
            </button>
          ))}
        </div>
        {widget === 'contact' && !contactFormEnabled ? (
          <p className="text-[12.5px] text-muted-foreground">
            Your contact form is switched off, so this embed will say the profile is not accepting
            messages.{' '}
            <Link
              className="text-foreground underline underline-offset-4"
              to={workspacePath('/audience')}
            >
              Turn it on in Audience
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-[14px] font-medium">Theme</p>
        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
          {THEMES.map((option) => (
            <button
              aria-pressed={theme === option}
              className={cn(
                'rounded-md px-3 py-1.5 text-[13px] capitalize text-muted-foreground',
                theme === option && 'bg-card font-medium text-foreground',
              )}
              key={option}
              onClick={() => setTheme(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          Auto follows the visitor&rsquo;s own light or dark setting.
        </p>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Paste this where it should appear
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-border/70 bg-card p-4 font-mono text-[12px] leading-relaxed">
          {snippet}
        </pre>
        <Button
          className="mt-2"
          onClick={() =>
            navigator.clipboard
              .writeText(snippet)
              .then(() => toast.success('Snippet copied'))
              .catch(() => toast.error('Could not copy.'))
          }
          size="sm"
          type="button"
          variant="outline"
        >
          <CopyIcon />
          Copy snippet
        </Button>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Preview
        </p>
        <iframe
          className="mt-2 w-full rounded-xl border border-border/70"
          height={widget === 'card' ? 200 : 520}
          src={`${origin}/embed/${slug}?widget=${widget}&theme=${theme}`}
          title="Embed preview"
        />
      </section>

      <p className="max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">
        The widget loads in a sandboxed frame, so your site&rsquo;s styles cannot break it and it
        cannot read your site&rsquo;s cookies. It reports its own height, so it never scrolls
        internally or leaves a gap.
      </p>
    </div>
  );
}
