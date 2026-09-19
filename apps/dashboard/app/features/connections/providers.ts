export type ConnectionProviderCategory =
  'Social' | 'Video' | 'Publishing' | 'Music' | 'Commerce' | 'Work' | 'Business';

export type ConnectionProvider = {
  id: string;
  name: string;
  iconKey: string;
  category: ConnectionProviderCategory;
  description: string;
  accountNoun: string;
  popular?: boolean;
};

const provider = (
  id: string,
  name: string,
  category: ConnectionProviderCategory,
  description: string,
  options: Partial<Pick<ConnectionProvider, 'iconKey' | 'accountNoun' | 'popular'>> = {},
): ConnectionProvider => ({
  id,
  name,
  category,
  description,
  iconKey: options.iconKey ?? id,
  accountNoun: options.accountNoun ?? 'account',
  popular: options.popular,
});

export const CONNECTION_PROVIDER_CATEGORIES: ConnectionProviderCategory[] = [
  'Social',
  'Video',
  'Publishing',
  'Music',
  'Commerce',
  'Work',
  'Business',
];

export const CONNECTION_PROVIDERS: ConnectionProvider[] = [
  provider(
    'instagram',
    'Instagram',
    'Social',
    'Profile identity, biography and account metadata.',
    {
      popular: true,
    },
  ),
  provider('facebook', 'Facebook Pages', 'Social', 'Manage identity fields for eligible Pages.', {
    accountNoun: 'Page',
    popular: true,
  }),
  provider('tiktok', 'TikTok', 'Social', 'Account identity and permitted profile metadata.', {
    popular: true,
  }),
  provider('x', 'X', 'Social', 'Profile identity and permitted account fields.', { popular: true }),
  provider('threads', 'Threads', 'Social', 'Threads identity and profile information.'),
  provider('linkedin', 'LinkedIn', 'Social', 'Personal or organization identity where permitted.', {
    accountNoun: 'profile',
    popular: true,
  }),
  provider('pinterest', 'Pinterest', 'Social', 'Profile and business account metadata.'),
  provider('snapchat', 'Snapchat', 'Social', 'Public profile identity where supported.'),
  provider('reddit', 'Reddit', 'Social', 'Account identity and public profile metadata.'),
  provider('discord', 'Discord', 'Social', 'User or server identity and permitted metadata.', {
    accountNoun: 'account or server',
  }),
  provider('telegram', 'Telegram', 'Social', 'Channel or account identity where supported.', {
    accountNoun: 'channel',
  }),
  provider('whatsapp', 'WhatsApp Business', 'Business', 'Business profile and contact identity.', {
    accountNoun: 'business account',
  }),
  provider('youtube', 'YouTube', 'Video', 'Channel identity, description and branding metadata.', {
    accountNoun: 'channel',
    popular: true,
  }),
  provider('twitch', 'Twitch', 'Video', 'Channel identity and profile metadata.', {
    accountNoun: 'channel',
  }),
  provider('vimeo', 'Vimeo', 'Video', 'Creator profile and channel information.'),
  provider('medium', 'Medium', 'Publishing', 'Publication and author identity.', {
    accountNoun: 'profile or publication',
  }),
  provider('substack', 'Substack', 'Publishing', 'Publication identity and metadata.', {
    accountNoun: 'publication',
  }),
  provider('beehiiv', 'beehiiv', 'Publishing', 'Newsletter publication identity.', {
    accountNoun: 'publication',
  }),
  provider('wordpress', 'WordPress', 'Publishing', 'Site profile and publication identity.', {
    accountNoun: 'site',
  }),
  provider('spotify', 'Spotify', 'Music', 'Artist or show identity and catalog metadata.', {
    accountNoun: 'artist or show',
    popular: true,
  }),
  provider(
    'apple-music',
    'Apple Music',
    'Music',
    'Artist identity where platform access permits.',
    {
      accountNoun: 'artist',
    },
  ),
  provider('soundcloud', 'SoundCloud', 'Music', 'Creator profile and permitted account metadata.'),
  provider('shopify', 'Shopify', 'Commerce', 'Store identity and storefront metadata.', {
    accountNoun: 'store',
    popular: true,
  }),
  provider('etsy', 'Etsy', 'Commerce', 'Shop identity and public storefront information.', {
    accountNoun: 'shop',
  }),
  provider(
    'amazon-storefront',
    'Amazon Storefront',
    'Commerce',
    'Storefront identity and public details.',
    {
      accountNoun: 'storefront',
    },
  ),
  provider('github', 'GitHub', 'Work', 'Developer identity, biography and organization metadata.', {
    popular: true,
  }),
  provider('gitlab', 'GitLab', 'Work', 'Developer identity and profile information.'),
  provider('behance', 'Behance', 'Work', 'Creative profile and portfolio identity.'),
  provider('dribbble', 'Dribbble', 'Work', 'Designer profile and portfolio identity.'),
  provider('figma', 'Figma', 'Work', 'Team and creator identity where supported.'),
  provider(
    'google-business',
    'Google Business Profile',
    'Business',
    'Business identity, location and contact information.',
    {
      iconKey: 'google-play',
      accountNoun: 'business profile',
      popular: true,
    },
  ),
];

const providersById = new Map(CONNECTION_PROVIDERS.map((item) => [item.id, item]));

export function getConnectionProvider(id: string) {
  return providersById.get(id);
}
