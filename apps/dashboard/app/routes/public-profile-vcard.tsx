import { getAuth } from '@clerk/react-router/server';
import { toCapitalised } from '@ownlane/ui/lib/text';

import { cloudflare } from '../lib/cloudflare';
import { canPreview, readPublicProfile } from '../lib/profiles.server';
import type { Route } from './+types/public-profile-vcard';

/** Commas, semicolons and newlines carry meaning in a vCard, so they escape. */
function escape(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\;');
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { family: '', given: full.trim() };

  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

/**
 * The profile as a contact card. Built from published fields only — a hidden
 * phone number must not leave by this door either.
 */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const page = await readPublicProfile(env.DB, args.params.slug);

  if (!page) throw new Response('Not found', { status: 404 });

  if (page.visibility !== 'public') {
    const { userId } = await getAuth(args);
    if (!(await canPreview(env.DB, page.workspaceId, userId ?? null))) {
      throw new Response('Not found', { status: 404 });
    }
  }

  const { profile } = page;
  const origin = env.PUBLIC_SITE_ORIGIN?.trim() || new URL(args.request.url).origin;
  // Stored names keep the casing they were typed in; a contact card should not.
  const fullName = toCapitalised(profile.displayName || page.slug);
  const { family, given } = splitName(fullName);

  const published = new Map(page.contact.map((entry) => [entry.channel, entry.value]));
  const place = [profile.city, profile.country].filter(Boolean).join(';');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(family)};${escape(given)};;;`,
    `FN:${escape(fullName)}`,
    profile.profession ? `TITLE:${escape(profile.profession)}` : '',
    profile.shortBio ? `NOTE:${escape(profile.shortBio)}` : '',
    published.get('publicEmail')
      ? `EMAIL;TYPE=INTERNET:${escape(published.get('publicEmail')!)}`
      : '',
    published.get('phone') ? `TEL;TYPE=CELL:${escape(published.get('phone')!)}` : '',
    published.get('whatsapp') ? `TEL;TYPE=WhatsApp:${escape(published.get('whatsapp')!)}` : '',
    profile.websiteUrl ? `URL:${escape(profile.websiteUrl)}` : '',
    `URL;TYPE=Ownlane:${origin}/${page.slug}`,
    published.get('bookingUrl') ? `URL;TYPE=Booking:${escape(published.get('bookingUrl')!)}` : '',
    place ? `ADR;TYPE=WORK:;;;${escape(profile.city)};;;${escape(profile.country)}` : '',
    profile.avatarKey ? `PHOTO;VALUE=URI:${origin}/assets/${profile.avatarKey}` : '',
    `REV:${new Date().toISOString()}`,
    'END:VCARD',
  ].filter(Boolean);

  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${page.slug}.vcf"`,
      'Cache-Control': 'no-store',
    },
  });
}
