import { getAuth } from '@clerk/react-router/server';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';
import { toCapitalised } from '@ownlane/ui/lib/text';

import { ProfileActions } from '../components/profile-actions';
import { PublicProfileAnalytics } from '../components/public-profile-analytics';
import { ProfileToc, type TocEntry } from '../components/profile-toc';
import { listContentItems } from '../features/content/queries.server';
import { trackProfileInteraction, type ProfileInteraction } from '../features/analytics/client';
import {
  PlatformIcon,
  detectLinkPlatform,
  getLinkPlatform,
  platformColors,
} from '../features/links/platforms';
import { ContactForm } from '../components/features/audience/contact-form';
import { readContactFormSettings } from '../features/audience/queries.server';
import { cloudflare } from '../lib/cloudflare';
import { PROFILE_FIELDS, fieldLabel, publicFields, type PublicSlot } from '../lib/profile-fields';
import {
  CHOICE_LABELS,
  type ContactChannel,
  type Profile,
  type ProfileField,
} from '../lib/profiles';
import { canPreview, readPublicProfile } from '../lib/profiles.server';
import type { Route } from './+types/public-profile';

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.page) return [{ title: 'Ownlane' }];

  const { profile } = loaderData.page;
  const name = toCapitalised(profile.displayName);

  // Every preview needs an absolute URL — a relative one resolves against the
  // crawler, not this site. The cover is the intended image; the avatar stands
  // in so a shared link is never imageless.
  const imageKey = profile.coverKey || profile.avatarKey;
  const image = imageKey ? `${loaderData.origin}/assets/${imageKey}` : null;

  return [
    { title: `${name} — Ownlane` },
    { name: 'description', content: profile.shortBio || profile.mediumBio || `${name} on Ownlane` },
    { property: 'og:title', content: name },
    { property: 'og:description', content: profile.shortBio || profile.mediumBio || '' },
    { property: 'og:type', content: 'profile' },
    { property: 'og:url', content: `${loaderData.origin}/${loaderData.page.slug}` },
    ...(image
      ? [
          { property: 'og:image', content: image },
          { property: 'og:image:alt', content: name },
          // A cover is a banner; an avatar crops badly in a wide card.
          {
            name: 'twitter:card',
            content: profile.coverKey ? 'summary_large_image' : 'summary',
          },
          { name: 'twitter:image', content: image },
        ]
      : []),
    ...(loaderData.page.visibility === 'public' ? [] : [{ name: 'robots', content: 'noindex' }]),
  ];
}

/**
 * The profile as the public sees it. A private profile is not served at all,
 * unless the person asking is a member of its workspace — then it renders as a
 * preview, clearly marked, so a profile can be checked before it goes live.
 */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const page = await readPublicProfile(env.DB, args.params.slug);

  if (!page) throw new Response('Not found', { status: 404 });

  const origin = env.PUBLIC_SITE_ORIGIN?.trim() || new URL(args.request.url).origin;

  let preview = false;
  if (page.visibility !== 'public') {
    const { userId } = await getAuth(args);
    const allowed = await canPreview(env.DB, page.workspaceId, userId ?? null);

    if (!allowed) throw new Response('Not found', { status: 404 });
    preview = true;
  }

  const [featuredContent, contactForm] = await Promise.all([
    listContentItems(env.DB, page.profile.id).then((items) =>
      items.filter((item) => item.isFeatured),
    ),
    readContactFormSettings(env.DB, page.profile.id),
  ]);

  return {
    page,
    origin,
    preview,
    featuredContent,
    contactForm,
    // Public by design: Turnstile's site key identifies the widget, not the account.
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY,
  };
}

/** A choice field reads as its label; everything else as its value. */
function readable(profile: Profile, field: ProfileField) {
  const spec = PROFILE_FIELDS[field];
  const value = (profile as Record<string, string>)[field] ?? '';

  if (spec.kind !== 'choice') return value;
  if (!value || value === 'unspecified' || value === 'none') return '';

  return CHOICE_LABELS[value] ?? value;
}

/** Which contact channel the 'preferred contact' choice points at. */
const PREFERRED_CHANNEL: Record<string, ContactChannel | undefined> = {
  email: 'publicEmail',
  phone: 'phone',
  whatsapp: 'whatsapp',
  booking: 'bookingUrl',
};

function contactHref(channel: ContactChannel, value: string) {
  if (channel === 'publicEmail') return `mailto:${value}`;
  if (channel === 'bookingUrl') return value;

  return `tel:${value.replace(/[^\d+]/g, '')}`;
}

function contactInteraction(channel: ContactChannel): ProfileInteraction {
  const interactions: Record<ContactChannel, ProfileInteraction> = {
    publicEmail: 'contact_email',
    phone: 'contact_phone',
    whatsapp: 'contact_whatsapp',
    bookingUrl: 'contact_booking',
  };
  return interactions[channel];
}

function toList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function PublicProfile({ loaderData }: Route.ComponentProps) {
  const { page, origin, preview, featuredContent, contactForm, turnstileSiteKey } = loaderData;
  const { profile } = page;

  /** Public slots are filled from the manifest, so a described field appears
      here without this page being edited. */
  const shown = (slot: PublicSlot) =>
    publicFields(slot)
      .map(([field, spec]) => ({ field, spec, value: readable(profile, field) }))
      .filter((entry) => entry.value);

  const name = profile.displayName ? toCapitalised(profile.displayName) : page.slug;
  const identity = shown('identity').filter((entry) => entry.field !== 'handle');
  const handle = profile.handle;
  const lead = shown('lead')[0]?.value ?? '';
  const body = shown('body')[0]?.value ?? '';
  const chips = shown('chips');
  const website = shown('website')[0]?.value ?? '';
  const availability = readable(profile, 'availabilityStatus');
  const preferred = PREFERRED_CHANNEL[profile.preferredContact];

  // City and Country say what the older free-text field said, so only one of
  // them is shown; availability has its own place in the rail.
  const place = [profile.city, profile.country].filter(Boolean).join(', ');
  const facts = shown('fact').filter(
    (entry) =>
      entry.field !== 'availabilityStatus' &&
      entry.field !== 'city' &&
      entry.field !== 'country' &&
      !(entry.field === 'location' && place),
  );
  const featuredLinks = page.links.filter((link) => !link.collectionId);
  const linkSections = Array.from(
    new Map(
      page.links
        .filter((link) => link.collectionId)
        .map((link) => [
          link.collectionId,
          {
            id: link.collectionId!,
            title: link.collectionTitle!,
            description: link.collectionDescription ?? '',
            layout: link.collectionLayout ?? 'list',
            links: page.links.filter((entry) => entry.collectionId === link.collectionId),
          },
        ]),
    ).values(),
  );

  // Only sections with something in them are offered for skipping to.
  const toc: TocEntry[] = [
    body ? { id: 'about', label: 'About' } : null,
    ...chips.map((entry) => ({ id: entry.field, label: entry.spec.label })),
    page.links.length ? { id: 'links', label: 'Links' } : null,
    featuredContent.length ? { id: 'work', label: 'Work' } : null,
    page.services.length ? { id: 'services', label: 'What I do' } : null,
    page.credibility.length ? { id: 'proof', label: 'Proof' } : null,
    facts.length || place ? { id: 'particulars', label: 'Particulars' } : null,
    page.contact.length || website || contactForm.isEnabled
      ? { id: 'contact', label: contactForm.heading }
      : null,
  ].filter((entry): entry is TocEntry => entry !== null);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {preview ? (
        <p className="bg-destructive/10 px-5 py-2 text-center text-[12.5px] text-destructive">
          Private preview — nobody else can see this page until you publish the profile.
        </p>
      ) : null}

      {/* Sharing a profile nobody else can open would only mislead, so these
          appear once it is published. */}
      {preview ? null : (
        <>
          <PublicProfileAnalytics slug={page.slug} />
          <ProfileActions
            name={name}
            slug={page.slug}
            tagline={lead}
            url={`${origin}/${page.slug}`}
          />
        </>
      )}

      <ProfileToc entries={toc} />

      {profile.coverKey ? (
        <img
          alt=""
          className="h-[180px] w-full object-cover sm:h-[240px]"
          src={`/assets/${profile.coverKey}`}
        />
      ) : null}

      <main
        className={`mx-auto w-full max-w-[640px] px-5 sm:px-8 ${
          // The banner already provides the space above the name.
          profile.coverKey ? 'pb-14 pt-10 sm:pb-20 sm:pt-12' : 'py-14 sm:py-20'
        }`}
      >
        <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {profile.avatarKey ? (
            <img
              alt=""
              className="size-20 shrink-0 rounded-full object-cover"
              height={80}
              src={`/assets/${profile.avatarKey}`}
              width={80}
            />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-full bg-foreground text-[24px] font-medium text-background">
              {name.charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="text-[30px] font-medium leading-tight tracking-[-0.03em]">{name}</h1>
            {identity.length ? (
              <p className="mt-1 text-[14px] text-muted-foreground">
                {identity.map((entry) => entry.value).join(' · ')}
              </p>
            ) : null}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {handle ? (
                <span className="font-mono text-[12px] text-muted-foreground/70">@{handle}</span>
              ) : null}
              {availability ? (
                <span className="flex items-center gap-1.5 text-[12.5px]">
                  <span className="size-[7px] rounded-full bg-[#15925c] ring-[3px] ring-[#15925c]/20" />
                  {availability}
                </span>
              ) : null}
            </p>
          </div>
        </header>

        {lead ? (
          <p className="mt-9 text-[17px] leading-relaxed tracking-[-0.01em]">{lead}</p>
        ) : null}

        {body ? (
          <Block id="about" title="About">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </Block>
        ) : null}

        {chips.map((entry) => (
          <Block id={entry.field} key={entry.field} title={entry.spec.label}>
            <ul className="flex flex-wrap gap-1.5">
              {toList(entry.value).map((item) => (
                <li
                  className="rounded-full bg-muted px-2.5 py-1 text-[13px] text-foreground/80"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </Block>
        ))}

        {featuredLinks.length ? (
          <Block id="links" title="Links">
            <PublicLinks links={featuredLinks} />
          </Block>
        ) : null}
        {linkSections.map((section, index) => (
          <Block
            id={featuredLinks.length || index ? `links-${section.id}` : 'links'}
            key={section.id}
            title={section.title}
          >
            {section.description ? (
              <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
                {section.description}
              </p>
            ) : null}
            <PublicLinks layout={section.layout} links={section.links} />
          </Block>
        ))}

        {featuredContent.length ? (
          <Block id="work" title="Featured work">
            <ul className="space-y-2">
              {featuredContent.map((item) => (
                <li key={item.id}>
                  <a
                    className="flex items-center gap-3 rounded-xl border border-border/70 p-2.5 text-[14px] transition-all hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-sm"
                    href={`/r/content/${item.id}`}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {item.kind === 'video' && item.imageUrl ? (
                      <img
                        alt=""
                        className="size-11 shrink-0 rounded-lg object-cover"
                        src={item.imageUrl}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                        {item.provider} · {item.kind}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 pr-1 text-muted-foreground">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {page.services.length ? (
          <Block id="services" title="What I do">
            <ul className="space-y-3">
              {page.services.map((service) => (
                <li key={service.id}>
                  <p className="text-[14px] font-medium">{service.name}</p>
                  {service.description ? (
                    <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {page.credibility.length ? (
          <Block id="proof" title="Proof">
            <ul className="space-y-2.5">
              {page.credibility.map((entry) => (
                <li className="text-[13.5px]" key={entry.id}>
                  {entry.url ? (
                    <a
                      className="font-medium underline underline-offset-4"
                      href={entry.url}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {entry.label}
                    </a>
                  ) : (
                    <span className="font-medium">{entry.label}</span>
                  )}
                  {entry.issuer ? (
                    <span className="text-muted-foreground"> — {entry.issuer}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {facts.length || place ? (
          <Block id="particulars" title="Particulars">
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
              {place ? <Fact label="Based in" value={place} /> : null}
              {facts.map((entry) => (
                <Fact key={entry.field} label={entry.spec.label} value={entry.value} />
              ))}
            </dl>
          </Block>
        ) : null}

        {page.contact.length || website || contactForm.isEnabled ? (
          <Block id="contact" title={contactForm.heading}>
            <div className="flex flex-wrap gap-2">
              {page.contact.map(({ channel, value }) => (
                <a
                  className={
                    preferred === channel
                      ? 'rounded-lg bg-foreground px-3.5 py-2 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90'
                      : 'rounded-lg border border-border px-3.5 py-2 text-[13.5px] transition-colors hover:bg-accent/60'
                  }
                  href={contactHref(channel, value)}
                  key={channel}
                  onClick={() => trackProfileInteraction(page.slug, contactInteraction(channel))}
                  rel="noreferrer noopener"
                >
                  {fieldLabel(channel)}
                </a>
              ))}
              {website ? (
                <a
                  className="rounded-lg border border-border px-3.5 py-2 text-[13.5px] transition-colors hover:bg-accent/60"
                  href={website}
                  onClick={() => trackProfileInteraction(page.slug, 'website')}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Website
                </a>
              ) : null}
            </div>
            {contactForm.isEnabled ? (
              <div className="mt-7 max-w-[560px]">
                {contactForm.intro ? (
                  <p className="mb-5 text-[14px] leading-relaxed text-muted-foreground">
                    {contactForm.intro}
                  </p>
                ) : null}
                <ContactForm
                  settings={contactForm}
                  slug={page.slug}
                  turnstileSiteKey={turnstileSiteKey}
                />
              </div>
            ) : null}
          </Block>
        ) : null}

        <footer className="mt-16 border-t border-border/70 pt-5 text-[12px] text-muted-foreground">
          {/* The badge is how a profile brings the next person in, so it
              carries the slug that referred them. */}
          <a
            className="group inline-flex items-center gap-1 transition-colors hover:text-foreground"
            href={`/?ref=${page.slug}`}
            rel="noreferrer"
          >
            Made with
            <span className="font-medium text-foreground">Ownlane</span>
            <OwnlaneMark
              className="size-2.5 text-ownlane-orange transition-transform group-hover:scale-110"
              variant="open"
            />
          </a>
        </footer>
      </main>
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 scroll-mt-8" id={id}>
      <h2 className="pb-2.5 text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground/70">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PublicLinks({
  links,
  layout = 'list',
}: {
  links: Array<{
    id: string;
    label: string;
    url: string;
    thumbnailAssetId: string | null;
    platformKey: string | null;
  }>;
  layout?: 'list' | 'grid' | 'compact';
}) {
  return (
    <ul
      className={
        layout === 'grid'
          ? 'grid grid-cols-2 gap-2'
          : layout === 'compact'
            ? 'space-y-1'
            : 'space-y-2'
      }
    >
      {links.map((link) => (
        <li key={link.id}>
          <a
            className={`flex items-center gap-3 border border-border/70 text-[14px] transition-all hover:-translate-y-0.5 hover:bg-accent/50 hover:shadow-sm ${layout === 'compact' ? 'rounded-lg p-2' : 'rounded-xl p-2.5'} ${layout === 'grid' ? 'flex-col items-start' : ''}`}
            href={`/r/link/${link.id}`}
            rel="noreferrer noopener"
            target="_blank"
          >
            {link.thumbnailAssetId ? (
              <img
                alt=""
                className="size-11 shrink-0 rounded-lg object-cover"
                src={`/assets/${link.thumbnailAssetId}`}
              />
            ) : (
              <PublicLinkMark platformKey={link.platformKey} url={link.url} />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{link.label}</span>
            <span aria-hidden="true" className="shrink-0 pr-1 text-muted-foreground">
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function PublicLinkMark({ platformKey, url }: { platformKey: string | null; url: string }) {
  const platform = getLinkPlatform(platformKey) ?? detectLinkPlatform(url);
  if (!platform) return null;

  return (
    <span
      className="grid size-11 shrink-0 place-items-center rounded-lg shadow-sm"
      style={platformColors(platform)}
    >
      <PlatformIcon className="size-4" platform={platform} />
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-[0.07em] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
