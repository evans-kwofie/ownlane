import { BIO_GUIDANCE, PROFILE_CHOICES, type ProfileField } from './profiles';

/**
 * One description of every profile field, read by both the editor and the
 * public page. `PROFILE_FIELDS` is typed as a complete record, so adding a
 * field to `PROFILE_LIMITS` or `PROFILE_CHOICES` without describing it here
 * fails to compile — the public profile can never silently fall behind the
 * editor again.
 */

export type EditorGroup = 'identity' | 'about' | 'contact' | 'location' | 'controls';

/** How a field appears to the public, if at all. */
export type PublicSlot =
  | 'headline' // the name itself
  | 'identity' // sits under the name: profession, pronouns, handle
  | 'lead' // the tagline, set large
  | 'body' // long-form prose
  | 'chips' // comma-separated lists
  | 'fact' // a labelled value in the facts row
  | 'contact' // only when that channel is published
  | 'website' // always public, rendered with contact
  | 'none'; // never leaves the dashboard

export type FieldSpec = {
  label: string;
  group: EditorGroup;
  kind?: 'text' | 'textarea' | 'choice';
  placeholder?: string;
  hint?: string;
  /** Options for a choice field, mirroring PROFILE_CHOICES. */
  options?: readonly string[];
  public: PublicSlot;
  /** Order within its public slot; lower comes first. */
  order?: number;
};

export const PROFILE_FIELDS: Record<ProfileField, FieldSpec> = {
  displayName: { label: 'Display name', group: 'identity', placeholder: 'Evans Kwofie', public: 'headline' },
  handle: {
    label: 'Handle',
    group: 'identity',
    placeholder: 'evanskwofie',
    hint: 'The username you prefer across platforms.',
    public: 'identity',
    order: 2,
  },
  pronunciation: { label: 'Pronunciation', group: 'identity', placeholder: 'EV-anz KWOH-fee', public: 'identity', order: 3 },
  pronouns: { label: 'Pronouns', group: 'identity', placeholder: 'they/them', public: 'identity', order: 1 },
  profession: { label: 'Profession', group: 'identity', placeholder: 'Design engineer and founder', public: 'identity', order: 0 },
  company: {
    label: 'Company',
    group: 'identity',
    placeholder: 'Ownlane',
    hint: 'Used for connected profiles such as GitHub.',
    public: 'none',
  },
  creatorType: {
    label: 'Identity type',
    group: 'identity',
    kind: 'choice',
    options: PROFILE_CHOICES.creatorType,
    public: 'none',
  },

  shortBio: {
    label: 'Tagline',
    group: 'about',
    kind: 'textarea',
    placeholder: 'Design engineer and founder, building in the open.',
    hint: BIO_GUIDANCE.shortBio,
    public: 'lead',
  },
  mediumBio: {
    label: 'Summary',
    group: 'about',
    kind: 'textarea',
    placeholder: 'A paragraph on what you do and who you do it for.',
    hint: BIO_GUIDANCE.mediumBio,
    public: 'body',
    order: 1,
  },
  longBio: {
    label: 'Full bio',
    group: 'about',
    kind: 'textarea',
    placeholder: 'The complete version, for your own page and press kits.',
    hint: BIO_GUIDANCE.longBio,
    public: 'body',
    order: 0,
  },
  categories: {
    label: 'Categories',
    group: 'about',
    placeholder: 'Design, Software, Startups',
    hint: 'Comma separated. Used for discovery and benchmarks.',
    public: 'chips',
    order: 0,
  },
  skills: { label: 'Skills', group: 'about', placeholder: 'Product design, React, Brand identity', public: 'chips', order: 1 },
  languages: { label: 'Languages', group: 'about', placeholder: 'English, Twi', public: 'fact', order: 4 },

  publicEmail: { label: 'Email', group: 'contact', placeholder: 'hello@example.com', public: 'contact', order: 0 },
  phone: { label: 'Phone', group: 'contact', placeholder: '+233 20 000 0000', public: 'contact', order: 1 },
  whatsapp: { label: 'WhatsApp', group: 'contact', placeholder: '+233 20 000 0000', public: 'contact', order: 2 },
  bookingUrl: { label: 'Booking link', group: 'contact', placeholder: 'https://cal.com/you', public: 'contact', order: 3 },
  preferredContact: {
    label: 'Preferred',
    group: 'contact',
    kind: 'choice',
    options: PROFILE_CHOICES.preferredContact,
    public: 'none',
  },

  websiteUrl: { label: 'Website', group: 'location', placeholder: 'https://example.com', public: 'website' },
  city: { label: 'City', group: 'location', placeholder: 'Accra', public: 'fact', order: 0 },
  country: { label: 'Country', group: 'location', placeholder: 'Ghana', public: 'fact', order: 1 },
  serviceArea: {
    label: 'Service area',
    group: 'location',
    placeholder: 'West Africa and remote',
    public: 'fact',
    order: 2,
  },
  location: {
    label: 'Based in',
    group: 'location',
    placeholder: 'Accra, Ghana',
    hint: 'Superseded by City and Country; kept for profiles that filled it in.',
    public: 'fact',
    order: 3,
  },
  timezone: { label: 'Time zone', group: 'location', placeholder: 'GMT', public: 'fact', order: 5 },
  remoteAvailability: {
    label: 'Working style',
    group: 'location',
    kind: 'choice',
    options: PROFILE_CHOICES.remoteAvailability,
    public: 'fact',
    order: 6,
  },

  availabilityStatus: {
    label: 'Availability',
    group: 'about',
    kind: 'choice',
    options: PROFILE_CHOICES.availabilityStatus,
    hint: 'Shown on your public profile when it is not private.',
    public: 'fact',
    order: 7,
  },
  visibility: {
    label: 'Profile visibility',
    group: 'controls',
    kind: 'choice',
    options: PROFILE_CHOICES.visibility,
    public: 'none',
  },
};

const ENTRIES = Object.entries(PROFILE_FIELDS) as [ProfileField, FieldSpec][];

/** Fields in one editor group, in the order they are declared. */
export function fieldsInGroup(group: EditorGroup) {
  return ENTRIES.filter(([, spec]) => spec.group === group);
}

/** Fields that occupy one slot on the public page, in their declared order. */
export function publicFields(slot: PublicSlot) {
  return ENTRIES.filter(([, spec]) => spec.public === slot).sort(
    ([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99),
  );
}

export function fieldLabel(field: string) {
  return PROFILE_FIELDS[field as ProfileField]?.label ?? field;
}
