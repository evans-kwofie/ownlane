import { z } from 'zod';

export const linkSchema = z.object({
  label: z.string().trim().min(1, 'Give this link a label.').max(80, 'Use 80 characters or fewer.'),
  url: z.url('Enter a complete URL, including https://.').max(2_048, 'That URL is too long.'),
  publicationStatus: z.enum(['draft', 'live', 'paused', 'scheduled']),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  thumbnailAssetId: z.string().uuid().nullable().optional(),
  collectionId: z.string().uuid().nullable().optional(),
  platformKey: z.string().trim().max(64).nullable().optional(),
  connectedAccountId: z.string().uuid().nullable().optional(),
});

export type LinkInput = z.infer<typeof linkSchema>;

/** Extracts the field messages used by the link forms from Zod's error tree. */
export function linkFieldErrors(error: z.ZodError<LinkInput>) {
  const tree = z.treeifyError(error);
  return {
    label: tree.properties?.label?.errors[0],
    url: tree.properties?.url?.errors[0],
  };
}

export type ProfileLink = LinkInput & {
  id: string;
  position: number;
};

export type LinkCollection = {
  id: string;
  title: string;
  description: string;
  layout: 'list' | 'grid' | 'compact';
  position: number;
  isActive: number;
  linkCount: number;
};
