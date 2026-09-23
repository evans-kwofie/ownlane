import { z } from 'zod';

export const LEAD_STATUSES = ['new', 'replied', 'won', 'archived', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  replied: 'Replied',
  won: 'Won',
  archived: 'Archived',
  spam: 'Spam',
};

export const MESSAGE_MAX = 2000;
export const NOTE_MAX = 1000;
export const TAG_MAX = 24;

export const DEFAULT_CONTACT_FORM = {
  heading: 'Get in touch',
  intro: 'Send a message and it lands in my inbox.',
  consentText: 'I agree that my message and contact details may be stored so I can be replied to.',
} as const;

/**
 * The public contact form. The browser validates with this for immediate
 * feedback and the Worker validates the same schema again with `safeParse`,
 * because a browser value is never evidence.
 */
export const leadCaptureSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120, 'Name is too long'),
  email: z.email('Enter a complete email address, like you@example.com').max(254),
  phone: z.string().trim().max(40, 'Phone number is too long').optional().or(z.literal('')),
  subject: z.string().trim().max(120).optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(1, 'Add a message')
    .max(MESSAGE_MAX, `Keep the message under ${MESSAGE_MAX.toLocaleString()} characters`),
  // Checked in the browser as a boolean; arrives as the checkbox value.
  consent: z.literal('on', { error: 'Tick the box so we can reply to you' }),
  // Turnstile's token. Absent when Turnstile is not configured.
  turnstileToken: z.string().optional(),
  // Always empty for a person. A bot fills every field it finds.
  website: z.literal('').optional(),
});

export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;

/** Settings for how the form presents itself, edited in profile configuration. */
export const contactFormSettingsSchema = z.object({
  isEnabled: z.coerce.boolean(),
  heading: z.string().trim().min(1, 'Give the form a heading').max(80),
  intro: z.string().trim().max(200).optional().or(z.literal('')),
  consentText: z
    .string()
    .trim()
    .min(10, 'Consent wording needs to say what someone is agreeing to')
    .max(400),
  askSubject: z.coerce.boolean(),
  askPhone: z.coerce.boolean(),
  notifyOwner: z.coerce.boolean(),
  notifyEmail: z.email('Enter the address to notify').max(254).optional().or(z.literal('')),
});

export type ContactFormSettingsInput = z.infer<typeof contactFormSettingsSchema>;

export const leadNoteSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1, 'Write something first').max(NOTE_MAX),
});

export const leadTagSchema = z.object({
  leadId: z.string().min(1),
  tag: z.string().trim().min(1, 'Name the tag').max(TAG_MAX),
});

export const leadStatusSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1),
  status: z.enum(LEAD_STATUSES),
});

export type ContactFormSettings = {
  isEnabled: boolean;
  heading: string;
  intro: string;
  consentText: string;
  askSubject: boolean;
  askPhone: boolean;
  notifyOwner: boolean;
  notifyEmail: string | null;
};

export type LeadNote = {
  id: string;
  body: string;
  authorUserId: string;
  createdAt: string;
};

export type LeadSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: LeadStatus;
  isUnread: boolean;
  createdAt: string;
  utmCampaign: string | null;
  tags: string[];
};

export type Lead = LeadSummary & {
  referrerHost: string | null;
  countryCode: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  consentText: string;
  consentedAt: string;
  notes: LeadNote[];
};

export type AudienceOverview = {
  leads: LeadSummary[];
  counts: Record<LeadStatus | 'all', number>;
  tags: string[];
  formEnabled: boolean;
  nextCursor: string | null;
};
