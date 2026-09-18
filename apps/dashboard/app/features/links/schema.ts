import { z } from 'zod';

export const linkSchema = z.object({
  label: z.string().trim().min(1, 'Give this link a label.').max(80, 'Use 80 characters or fewer.'),
  url: z.url('Enter a complete URL, including https://.').max(2_048, 'That URL is too long.'),
  publicationStatus: z.enum(['draft', 'live', 'paused', 'scheduled']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export type LinkInput = z.infer<typeof linkSchema>;

export type ProfileLink = LinkInput & { id: string; position: number; collectionId: string | null };

export type LinkCollection = { id: string; title: string; position: number; isActive: number; linkCount: number };
