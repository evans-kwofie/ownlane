import { z } from 'zod';

export const connectionStatusSchema = z.enum([
  'pending',
  'connected',
  'reconnect_required',
  'revoked',
]);

export const tokenHealthSchema = z.enum(['unknown', 'healthy', 'expiring', 'expired', 'missing']);
export const syncModeSchema = z.enum(['off', 'manual', 'automatic', 'scheduled']);
export const capabilityAccessSchema = z.enum([
  'read',
  'write',
  'read-write',
  'manual',
  'approval',
  'unsupported',
]);

export const connectionPreferencesSchema = z.object({
  syncMode: syncModeSchema,
  approvalRequired: z.boolean(),
  fields: z.array(z.string().trim().min(1).max(64)).max(50),
});

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type TokenHealth = z.infer<typeof tokenHealthSchema>;
export type SyncMode = z.infer<typeof syncModeSchema>;
export type CapabilityAccess = z.infer<typeof capabilityAccessSchema>;
export type ConnectionPreferences = z.infer<typeof connectionPreferencesSchema>;

export type ConnectionCapability = {
  field: string;
  label: string;
  access: CapabilityAccess;
};

export type ConnectedAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  handle: string | null;
  displayName: string | null;
  accountType: string | null;
  status: ConnectionStatus;
  tokenHealth: TokenHealth;
  tokenExpiresAt: string | null;
  syncMode: SyncMode;
  approvalRequired: boolean;
  selectedFields: string[];
  capabilities: ConnectionCapability[];
  scopes: string[];
  ownerUserId: string | null;
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  latestSyncStatus: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | null;
  latestSyncAt: string | null;
  publicLinkCount: number;
  createdAt: string;
};
