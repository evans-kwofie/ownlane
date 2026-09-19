import type { SimpleIcon } from 'simple-icons';
import {
  siApplemusic,
  siApplepodcasts,
  siAppstore,
  siAudiomack,
  siBandcamp,
  siBehance,
  siBigcartel,
  siBluesky,
  siBuymeacoffee,
  siCalendly,
  siCarrd,
  siDeezer,
  siDiscord,
  siDribbble,
  siEtsy,
  siFacebook,
  siFigma,
  siFiverr,
  siGhost,
  siGithub,
  siGitlab,
  siGoodreads,
  siGoogleplay,
  siGumroad,
  siInstagram,
  siItchdotio,
  siKick,
  siKofi,
  siLetterboxd,
  siLinktree,
  siMastodon,
  siMedium,
  siMixcloud,
  siNotion,
  siOnlyfans,
  siPatreon,
  siPinterest,
  siPocketcasts,
  siReddit,
  siSnapchat,
  siSoundcloud,
  siSpotify,
  siSquarespace,
  siSteam,
  siStrava,
  siSubstack,
  siTelegram,
  siThreads,
  siTidal,
  siTiktok,
  siTwitch,
  siUpwork,
  siVimeo,
  siWebflow,
  siWhatsapp,
  siWordpress,
  siX,
  siYoutube,
} from 'simple-icons';

export const PLATFORM_CATEGORIES = [
  'Social',
  'Video & live',
  'Music & audio',
  'Writing',
  'Community',
  'Store & support',
  'Work & portfolio',
  'Apps & interests',
  'Contact',
] as const;

export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];

export type LinkPlatform = {
  id: string;
  name: string;
  category: PlatformCategory;
  icon?: SimpleIcon;
  aliases?: string[];
  baseUrl?: string;
  placeholder?: string;
  inputLabel?: string;
  popular?: boolean;
};

const p = (
  id: string,
  name: string,
  category: PlatformCategory,
  icon?: SimpleIcon,
  options: Omit<LinkPlatform, 'id' | 'name' | 'category' | 'icon'> = {},
): LinkPlatform => ({ id, name, category, icon, ...options });

export const LINK_PLATFORMS: LinkPlatform[] = [
  p('instagram', 'Instagram', 'Social', siInstagram, {
    baseUrl: 'https://instagram.com/',
    popular: true,
  }),
  p('x', 'X', 'Social', siX, { aliases: ['twitter'], baseUrl: 'https://x.com/', popular: true }),
  p('tiktok', 'TikTok', 'Social', siTiktok, { baseUrl: 'https://tiktok.com/@', popular: true }),
  p('facebook', 'Facebook', 'Social', siFacebook, {
    baseUrl: 'https://facebook.com/',
    popular: true,
  }),
  p('threads', 'Threads', 'Social', siThreads, { baseUrl: 'https://threads.net/@' }),
  p('bluesky', 'Bluesky', 'Social', siBluesky, {
    aliases: ['bsky'],
    baseUrl: 'https://bsky.app/profile/',
  }),
  p('linkedin', 'LinkedIn', 'Social', undefined, {
    baseUrl: 'https://linkedin.com/in/',
    popular: true,
  }),
  p('mastodon', 'Mastodon', 'Social', siMastodon, { placeholder: 'https://mastodon.social/@you' }),
  p('snapchat', 'Snapchat', 'Social', siSnapchat, { baseUrl: 'https://snapchat.com/add/' }),
  p('pinterest', 'Pinterest', 'Social', siPinterest, { baseUrl: 'https://pinterest.com/' }),
  p('reddit', 'Reddit', 'Social', siReddit, { baseUrl: 'https://reddit.com/u/' }),

  p('youtube', 'YouTube', 'Video & live', siYoutube, {
    baseUrl: 'https://youtube.com/@',
    popular: true,
  }),
  p('twitch', 'Twitch', 'Video & live', siTwitch, { baseUrl: 'https://twitch.tv/', popular: true }),
  p('vimeo', 'Vimeo', 'Video & live', siVimeo, { baseUrl: 'https://vimeo.com/' }),
  p('kick', 'Kick', 'Video & live', siKick, { baseUrl: 'https://kick.com/' }),

  p('spotify', 'Spotify', 'Music & audio', siSpotify, {
    placeholder: 'Paste your Spotify artist, show, or playlist URL',
    popular: true,
  }),
  p('apple-music', 'Apple Music', 'Music & audio', siApplemusic, {
    placeholder: 'Paste your Apple Music URL',
  }),
  p('apple-podcasts', 'Apple Podcasts', 'Music & audio', siApplepodcasts, {
    placeholder: 'Paste your Apple Podcasts URL',
  }),
  p('soundcloud', 'SoundCloud', 'Music & audio', siSoundcloud, {
    baseUrl: 'https://soundcloud.com/',
  }),
  p('bandcamp', 'Bandcamp', 'Music & audio', siBandcamp, {
    placeholder: 'https://yourname.bandcamp.com',
  }),
  p('audiomack', 'Audiomack', 'Music & audio', siAudiomack, { baseUrl: 'https://audiomack.com/' }),
  p('tidal', 'TIDAL', 'Music & audio', siTidal, { placeholder: 'Paste your TIDAL URL' }),
  p('deezer', 'Deezer', 'Music & audio', siDeezer, { placeholder: 'Paste your Deezer URL' }),
  p('mixcloud', 'Mixcloud', 'Music & audio', siMixcloud, { baseUrl: 'https://mixcloud.com/' }),
  p('pocket-casts', 'Pocket Casts', 'Music & audio', siPocketcasts, {
    placeholder: 'Paste your podcast URL',
  }),

  p('substack', 'Substack', 'Writing', siSubstack, {
    placeholder: 'https://yourname.substack.com',
    popular: true,
  }),
  p('medium', 'Medium', 'Writing', siMedium, { baseUrl: 'https://medium.com/@' }),
  p('ghost', 'Ghost', 'Writing', siGhost, { placeholder: 'Paste your publication URL' }),
  p('beehiiv', 'beehiiv', 'Writing', undefined, {
    placeholder: 'Paste your beehiiv publication URL',
  }),
  p('wordpress', 'WordPress', 'Writing', siWordpress, {
    placeholder: 'Paste your WordPress site URL',
  }),
  p('goodreads', 'Goodreads', 'Writing', siGoodreads, {
    placeholder: 'Paste your Goodreads profile URL',
  }),

  p('discord', 'Discord', 'Community', siDiscord, {
    placeholder: 'Paste your Discord invite URL',
    popular: true,
  }),
  p('telegram', 'Telegram', 'Community', siTelegram, { baseUrl: 'https://t.me/', popular: true }),
  p('whatsapp', 'WhatsApp', 'Community', siWhatsapp, {
    aliases: ['wa'],
    baseUrl: 'https://wa.me/',
    inputLabel: 'Phone number or URL',
    popular: true,
  }),

  p('patreon', 'Patreon', 'Store & support', siPatreon, {
    baseUrl: 'https://patreon.com/',
    popular: true,
  }),
  p('kofi', 'Ko-fi', 'Store & support', siKofi, {
    aliases: ['ko-fi'],
    baseUrl: 'https://ko-fi.com/',
  }),
  p('buy-me-a-coffee', 'Buy Me a Coffee', 'Store & support', siBuymeacoffee, {
    baseUrl: 'https://buymeacoffee.com/',
  }),
  p('gumroad', 'Gumroad', 'Store & support', siGumroad, { baseUrl: 'https://gumroad.com/' }),
  p('etsy', 'Etsy', 'Store & support', siEtsy, { placeholder: 'Paste your Etsy shop URL' }),
  p('shopify', 'Shopify', 'Store & support', undefined, {
    placeholder: 'Paste your storefront URL',
  }),
  p('big-cartel', 'Big Cartel', 'Store & support', siBigcartel, {
    placeholder: 'Paste your shop URL',
  }),
  p('onlyfans', 'OnlyFans', 'Store & support', siOnlyfans, { baseUrl: 'https://onlyfans.com/' }),
  p('amazon', 'Amazon Storefront', 'Store & support', undefined, {
    placeholder: 'Paste your storefront URL',
  }),

  p('github', 'GitHub', 'Work & portfolio', siGithub, {
    baseUrl: 'https://github.com/',
    popular: true,
  }),
  p('gitlab', 'GitLab', 'Work & portfolio', siGitlab, { baseUrl: 'https://gitlab.com/' }),
  p('behance', 'Behance', 'Work & portfolio', siBehance, { baseUrl: 'https://behance.net/' }),
  p('dribbble', 'Dribbble', 'Work & portfolio', siDribbble, { baseUrl: 'https://dribbble.com/' }),
  p('figma', 'Figma', 'Work & portfolio', siFigma, {
    placeholder: 'Paste your Figma profile or community URL',
  }),
  p('notion', 'Notion', 'Work & portfolio', siNotion, {
    placeholder: 'Paste your published Notion URL',
  }),
  p('calendly', 'Calendly', 'Work & portfolio', siCalendly, {
    baseUrl: 'https://calendly.com/',
    popular: true,
  }),
  p('fiverr', 'Fiverr', 'Work & portfolio', siFiverr, { baseUrl: 'https://fiverr.com/' }),
  p('upwork', 'Upwork', 'Work & portfolio', siUpwork, {
    placeholder: 'Paste your Upwork profile URL',
  }),
  p('webflow', 'Webflow', 'Work & portfolio', siWebflow, {
    placeholder: 'Paste your Webflow site URL',
  }),
  p('squarespace', 'Squarespace', 'Work & portfolio', siSquarespace, {
    placeholder: 'Paste your site URL',
  }),
  p('carrd', 'Carrd', 'Work & portfolio', siCarrd, { placeholder: 'https://yourname.carrd.co' }),
  p('linktree', 'Linktree', 'Work & portfolio', siLinktree, { baseUrl: 'https://linktr.ee/' }),

  p('app-store', 'App Store', 'Apps & interests', siAppstore, {
    placeholder: 'Paste your App Store URL',
  }),
  p('google-play', 'Google Play', 'Apps & interests', siGoogleplay, {
    placeholder: 'Paste your Google Play URL',
  }),
  p('steam', 'Steam', 'Apps & interests', siSteam, {
    placeholder: 'Paste your Steam profile or game URL',
  }),
  p('itchio', 'itch.io', 'Apps & interests', siItchdotio, {
    placeholder: 'https://yourname.itch.io',
  }),
  p('letterboxd', 'Letterboxd', 'Apps & interests', siLetterboxd, {
    baseUrl: 'https://letterboxd.com/',
  }),
  p('strava', 'Strava', 'Apps & interests', siStrava, {
    placeholder: 'Paste your Strava profile URL',
  }),

  p('email', 'Email', 'Contact', undefined, {
    inputLabel: 'Email address',
    placeholder: 'you@example.com',
  }),
  p('phone', 'Phone', 'Contact', undefined, { inputLabel: 'Phone number', placeholder: '+233…' }),
  p('website', 'Website', 'Contact', undefined, {
    aliases: ['site', 'homepage'],
    placeholder: 'https://yourwebsite.com',
    popular: true,
  }),
];

const byId = new Map(LINK_PLATFORMS.map((platform) => [platform.id, platform]));

export function normalizeProvider(provider: string) {
  const value = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (value === 'twitter') return 'x';
  if (value === 'applemusic') return 'apple-music';
  if (value === 'applepodcasts') return 'apple-podcasts';
  return LINK_PLATFORMS.find(
    (platform) =>
      platform.id.replace(/[^a-z0-9]/g, '') === value ||
      platform.aliases?.some((alias) => alias.replace(/[^a-z0-9]/g, '') === value),
  )?.id;
}

export function getLinkPlatform(id?: string | null) {
  return id ? byId.get(id) : undefined;
}

const DOMAIN_PLATFORMS: Record<string, string> = {
  'instagram.com': 'instagram',
  'x.com': 'x',
  'twitter.com': 'x',
  'tiktok.com': 'tiktok',
  'facebook.com': 'facebook',
  'threads.net': 'threads',
  'bsky.app': 'bluesky',
  'linkedin.com': 'linkedin',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'twitch.tv': 'twitch',
  'vimeo.com': 'vimeo',
  'kick.com': 'kick',
  'open.spotify.com': 'spotify',
  'music.apple.com': 'apple-music',
  'podcasts.apple.com': 'apple-podcasts',
  'soundcloud.com': 'soundcloud',
  'bandcamp.com': 'bandcamp',
  'audiomack.com': 'audiomack',
  'tidal.com': 'tidal',
  'deezer.com': 'deezer',
  'substack.com': 'substack',
  'medium.com': 'medium',
  'discord.gg': 'discord',
  'discord.com': 'discord',
  't.me': 'telegram',
  'wa.me': 'whatsapp',
  'patreon.com': 'patreon',
  'ko-fi.com': 'kofi',
  'buymeacoffee.com': 'buy-me-a-coffee',
  'gumroad.com': 'gumroad',
  'etsy.com': 'etsy',
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'behance.net': 'behance',
  'dribbble.com': 'dribbble',
  'figma.com': 'figma',
  'calendly.com': 'calendly',
  'linktr.ee': 'linktree',
  'letterboxd.com': 'letterboxd',
  'strava.com': 'strava',
};

export function detectLinkPlatform(value: string) {
  if (/^mailto:/i.test(value)) return getLinkPlatform('email');
  if (/^tel:/i.test(value)) return getLinkPlatform('phone');
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const match = Object.entries(DOMAIN_PLATFORMS).find(
      ([domain]) => host === domain || host.endsWith(`.${domain}`),
    );
    return getLinkPlatform(match?.[1]);
  } catch {
    return undefined;
  }
}

export function platformUrl(platform: LinkPlatform, input: string) {
  const value = input.trim();
  if (!value) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (platform.id === 'email') return `mailto:${value}`;
  if (platform.id === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`;
  if (platform.id === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  if (/^(www\.)?[^\s]+\.[a-z]{2,}(\/|$)/i.test(value))
    return `https://${value.replace(/^www\./, '')}`;
  return platform.baseUrl ? `${platform.baseUrl}${value.replace(/^@/, '')}` : value;
}

export function PlatformIcon({
  platform,
  className = 'size-5',
}: {
  platform?: LinkPlatform;
  className?: string;
}) {
  if (!platform?.icon)
    return (
      <span className="text-[11px] font-bold uppercase">{platform?.name.slice(0, 2) ?? '↗'}</span>
    );
  return (
    <svg aria-hidden="true" className={className} role="img" viewBox="0 0 24 24">
      <path d={platform.icon.path} fill="currentColor" />
    </svg>
  );
}

export function platformColors(platform?: LinkPlatform) {
  const background = platform?.icon ? `#${platform.icon.hex}` : 'var(--foreground)';
  const light = ['FFD600', 'FFFC00', 'FFFFFF'].includes(platform?.icon?.hex ?? '');
  return {
    backgroundColor: background,
    color: platform?.icon ? (light ? '#111111' : '#ffffff') : 'var(--background)',
  };
}
