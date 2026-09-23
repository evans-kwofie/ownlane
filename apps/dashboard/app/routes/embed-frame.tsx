import { useEffect, useRef } from 'react';

import { ContactForm } from '../components/features/audience/contact-form';
import { readContactFormSettings } from '../features/audience/queries.server';
import { cloudflare } from '../lib/cloudflare';
import { readPublicProfile } from '../lib/profiles.server';
import type { Route } from './+types/embed-frame';

/**
 * What an embed actually renders, inside its iframe.
 *
 * Reuses the real contact form, so an embedded form and the one on the public
 * profile cannot drift apart — same validation, same Turnstile, same consent
 * wording, same endpoint.
 */
export function meta(_: Route.MetaArgs) {
  return [{ name: 'robots', content: 'noindex' }];
}

export function headers() {
  return {
    // The point of an embed is to be framed, so the usual deny is wrong here.
    // Framing is safe because the frame is sandboxed and shares nothing with
    // its host.
    'Content-Security-Policy': 'frame-ancestors *',
    'Cache-Control': 'no-store',
  };
}

export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const page = await readPublicProfile(env.DB, args.params.slug);
  if (!page || page.visibility !== 'public') throw new Response('Not found', { status: 404 });

  const url = new URL(args.request.url);
  const widget = url.searchParams.get('widget') === 'card' ? 'card' : 'contact';
  const theme = url.searchParams.get('theme') ?? 'auto';

  return {
    widget,
    theme,
    slug: page.slug,
    profile: {
      displayName: page.profile.displayName,
      shortBio: page.profile.shortBio,
      avatarKey: page.profile.avatarKey,
      handle: page.profile.handle,
    },
    contactForm: await readContactFormSettings(env.DB, page.profile.id),
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY,
    origin: env.PUBLIC_SITE_ORIGIN?.trim() || url.origin,
  };
}

export default function EmbedFrame({ loaderData }: Route.ComponentProps) {
  const { contactForm, origin, profile, slug, theme, turnstileSiteKey, widget } = loaderData;
  const root = useRef<HTMLDivElement>(null);

  // The host page cannot know how tall this is, so the frame reports itself.
  // A ResizeObserver rather than a one-off measure, because the form grows when
  // validation messages appear and shrinks again when they clear.
  useEffect(() => {
    const node = root.current;
    if (!node || window.parent === window) return;

    const report = () =>
      window.parent.postMessage(
        { type: 'ownlane:height', height: node.getBoundingClientRect().height + 8 },
        '*',
      );

    const observer = new ResizeObserver(report);
    observer.observe(node);
    report();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={theme === 'dark' ? 'dark' : undefined}
      data-theme={theme === 'auto' ? undefined : theme}
      ref={root}
      style={{ background: 'transparent' }}
    >
      {widget === 'card' ? (
        <a
          className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 no-underline"
          href={`${origin}/${slug}`}
          rel="noreferrer noopener"
          target="_blank"
        >
          {profile.avatarKey ? (
            <img
              alt=""
              className="size-14 shrink-0 rounded-full object-cover"
              src={`${origin}/assets/${profile.avatarKey}`}
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-foreground text-[18px] font-medium text-background">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-[15px] font-medium text-foreground">
              {profile.displayName}
            </span>
            {profile.shortBio ? (
              <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                {profile.shortBio}
              </span>
            ) : null}
            <span className="mt-1.5 block text-[12px] text-muted-foreground">
              View profile on Ownlane →
            </span>
          </span>
        </a>
      ) : contactForm.isEnabled ? (
        <div className="rounded-xl border border-border bg-card p-4">
          {contactForm.heading ? (
            <p className="text-[15px] font-medium text-foreground">{contactForm.heading}</p>
          ) : null}
          {contactForm.intro ? (
            <p className="mb-4 mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {contactForm.intro}
            </p>
          ) : null}
          <ContactForm settings={contactForm} slug={slug} turnstileSiteKey={turnstileSiteKey} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
          This profile is not accepting messages.
        </p>
      )}
    </div>
  );
}
