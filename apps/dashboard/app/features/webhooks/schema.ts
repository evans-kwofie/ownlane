import { z } from 'zod';

export const WEBHOOK_EVENTS = ['lead.created'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookEndpointSchema = z.object({
  url: z
    .url('Enter the full https:// address that should receive events')
    .max(1000)
    .refine((value) => value.startsWith('https://'), {
      message: 'Webhooks are only delivered over https',
    }),
  label: z.string().trim().max(60).optional().or(z.literal('')),
  payloadMode: z.enum(['full', 'minimal']),
});

export type WebhookEndpointInput = z.infer<typeof webhookEndpointSchema>;

export type WebhookEndpoint = {
  id: string;
  url: string;
  label: string | null;
  secretHint: string;
  events: WebhookEvent[];
  payloadMode: 'full' | 'minimal';
  isActive: boolean;
  disabledReason: string | null;
  consecutiveFailures: number;
  createdAt: string;
  lastDelivery: {
    status: string;
    responseStatus: number | null;
    durationMs: number | null;
    at: string;
  } | null;
};

export type WebhookDelivery = {
  id: string;
  eventId: string;
  eventType: string;
  status: 'pending' | 'succeeded' | 'failed' | 'exhausted';
  attempt: number;
  responseStatus: number | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
};
