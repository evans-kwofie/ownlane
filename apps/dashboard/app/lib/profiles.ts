/**
 * The canonical profile: its shape, its rules, and the vocabulary the UI uses
 * to talk about it. Everything here is safe in the browser — database access
 * lives in `profiles.server.ts`.
 */

/** Single-value fields, with the length each one accepts. */
export const PROFILE_LIMITS = {
  displayName: 80,
  handle: 40,
  pronunciation: 60,
  pronouns: 30,
  profession: 80,
  company: 120,
  shortBio: 160,
  mediumBio: 400,
  longBio: 2000,
  categories: 160,
  skills: 240,
  languages: 120,
  publicEmail: 160,
  phone: 32,
  whatsapp: 32,
  bookingUrl: 200,
  websiteUrl: 200,
  city: 80,
  country: 80,
  serviceArea: 120,
  location: 80,
  timezone: 60,
} as const;

export type ProfileTextField = keyof typeof PROFILE_LIMITS;

/** Fields that take one of a fixed set of values. */
export const PROFILE_CHOICES = {
  creatorType: [
    'person',
    'creator',
    'freelancer',
    'founder',
    'artist',
    'agency',
    'business',
    'project',
  ],
  preferredContact: ['email', 'phone', 'whatsapp', 'booking', 'none'],
  remoteAvailability: ['unspecified', 'remote', 'hybrid', 'onsite'],
  availabilityStatus: ['unspecified', 'available', 'selective', 'booked', 'not_available'],
  visibility: ['public', 'private'],
} as const;

export type ProfileChoiceField = keyof typeof PROFILE_CHOICES;
export type ProfileField = ProfileTextField | ProfileChoiceField;

/** How each choice is written for a person rather than for the database. */
export const CHOICE_LABELS: Record<string, string> = {
  person: 'Person',
  creator: 'Creator',
  freelancer: 'Freelancer',
  founder: 'Founder',
  artist: 'Artist',
  agency: 'Agency',
  business: 'Business',
  project: 'Project',
  email: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  booking: 'Booking link',
  none: 'Do not show contact details',
  unspecified: 'Not specified',
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On site',
  available: 'Available for work',
  selective: 'Selective',
  booked: 'Booked out',
  not_available: 'Not available',
  public: 'Public',
  private: 'Private',
};

export type ContactChannel = 'publicEmail' | 'phone' | 'whatsapp' | 'bookingUrl';
export const CONTACT_CHANNELS: ContactChannel[] = [
  'publicEmail',
  'phone',
  'whatsapp',
  'bookingUrl',
];

export type CredibilityKind = 'verification' | 'credential' | 'affiliation' | 'press';

export type CredibilityEntry = {
  id: string;
  kind: CredibilityKind;
  label: string;
  url: string;
  issuer: string;
};

export type ServiceEntry = {
  id: string;
  name: string;
  description: string;
  url: string;
};

export type ProfileVersion = {
  id: string;
  createdAt: string;
  changedFields: ProfileField[];
  label: string;
};

export type ScheduledChange = {
  id: string;
  applyAt: string;
  status: 'pending' | 'applied' | 'cancelled' | 'failed';
  changes: Partial<Record<ProfileField, string>>;
  errorMessage: string;
};

export type Profile = Record<ProfileTextField, string> & {
  id: string;
  creatorType: string;
  preferredContact: string;
  remoteAvailability: string;
  availabilityStatus: string;
  visibility: string;
  avatarKey: string;
  coverKey: string;
  logoKey: string;
};

/** Why three bios exist, in the words the page uses. */
export const BIO_GUIDANCE = {
  shortBio: 'One line. X caps a bio at 160 characters.',
  mediumBio: 'A short paragraph, for LinkedIn and podcast directories.',
  longBio: 'The full version, for your own page and press kits.',
} as const;

/** Fields whose truth can be taken from a connected platform instead. */
export const SOURCEABLE_FIELDS: ProfileTextField[] = [
  'displayName',
  'handle',
  'profession',
  'shortBio',
  'mediumBio',
  'longBio',
  'websiteUrl',
  'location',
];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isTextField(field: string): field is ProfileTextField {
  return field in PROFILE_LIMITS;
}

export function isChoiceField(field: string): field is ProfileChoiceField {
  return field in PROFILE_CHOICES;
}

/** Field-level validation, shared by the form, the action and the scheduler. */
export function validateProfile(changes: Partial<Record<ProfileField, string>>) {
  const errors: Partial<Record<ProfileField, string>> = {};

  for (const [key, raw] of Object.entries(changes) as [ProfileField, string][]) {
    const value = raw.trim();

    if (isChoiceField(key)) {
      const allowed = PROFILE_CHOICES[key] as readonly string[];
      if (!allowed.includes(value)) errors[key] = 'Choose one of the listed options.';
      continue;
    }

    if (value.length > PROFILE_LIMITS[key]) {
      errors[key] = `Keep this under ${PROFILE_LIMITS[key]} characters.`;
      continue;
    }

    if (key === 'displayName' && !value) {
      errors[key] = 'A name is required — it is what every platform shows.';
    }

    if (key === 'handle' && value && !/^[a-z0-9._-]+$/i.test(value)) {
      errors[key] = 'Letters, numbers, dots, dashes and underscores only.';
    }

    if ((key === 'websiteUrl' || key === 'bookingUrl') && value && !isUrl(value)) {
      errors[key] = 'Enter a full address, including https://';
    }

    if (key === 'publicEmail' && value && !isEmail(value)) {
      errors[key] = 'Enter a valid email address.';
    }

    if ((key === 'phone' || key === 'whatsapp') && value && !/^[+0-9().\s-]+$/.test(value)) {
      errors[key] = 'Digits, spaces and + ( ) - only.';
    }
  }

  return errors;
}

/** "3 minutes ago", "in 2 days" — used by version history and schedules. */
export function relativeTime(iso: string, now = Date.now()) {
  const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < 60) return format.format(Math.round(seconds), 'second');
  if (abs < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return format.format(Math.round(seconds / 3600), 'hour');
  if (abs < 2592000) return format.format(Math.round(seconds / 86400), 'day');

  return new Date(then).toLocaleDateString();
}
