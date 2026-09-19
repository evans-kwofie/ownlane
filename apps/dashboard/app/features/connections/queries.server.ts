import {
  capabilityAccessSchema,
  connectionStatusSchema,
  syncModeSchema,
  tokenHealthSchema,
  type ConnectedAccount,
  type ConnectionCapability,
} from './schema';

const FIELD_LABELS: Record<string, string> = {
  displayName: 'Display name',
  avatar: 'Profile image',
  bio: 'Biography',
  website: 'Website',
  location: 'Location',
  email: 'Public email',
  phone: 'Phone',
  username: 'Username',
  cover: 'Cover image',
};

function readJson(value: string | null, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function titleFromKey(value: string) {
  return (
    FIELD_LABELS[value] ??
    value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

function parseCapabilities(value: string | null): ConnectionCapability[] {
  const parsed = readJson(value, {});
  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      const field = typeof item.field === 'string' ? item.field : '';
      const access = capabilityAccessSchema.safeParse(item.access);
      if (!field || !access.success) return [];
      return [
        {
          field,
          label: typeof item.label === 'string' ? item.label : titleFromKey(field),
          access: access.data,
        },
      ];
    });
  }
  if (!parsed || typeof parsed !== 'object') return [];
  return Object.entries(parsed as Record<string, unknown>).flatMap(([field, rawAccess]) => {
    const access = capabilityAccessSchema.safeParse(rawAccess);
    return access.success ? [{ field, label: titleFromKey(field), access: access.data }] : [];
  });
}

type ConnectionRow = {
  id: string;
  provider: string;
  providerAccountId: string;
  handle: string | null;
  displayName: string | null;
  accountType: string | null;
  status: string;
  tokenHealth: string;
  tokenExpiresAt: string | null;
  syncMode: string;
  syncPreferencesJson: string;
  capabilitiesJson: string;
  scopesJson: string;
  ownerUserId: string | null;
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  latestSyncStatus: ConnectedAccount['latestSyncStatus'];
  latestSyncAt: string | null;
  publicLinkCount: number;
  createdAt: string;
};

export async function listConnectedAccounts(
  db: D1Database,
  profileId: string,
): Promise<ConnectedAccount[]> {
  const rows = await db
    .prepare(
      `SELECT a.id, a.provider, a.provider_account_id AS providerAccountId,
              a.provider_handle AS handle, a.display_name AS displayName,
              a.account_type AS accountType, a.connection_status AS status,
              a.token_health AS tokenHealth, a.token_expires_at AS tokenExpiresAt,
              a.sync_mode AS syncMode, a.sync_preferences_json AS syncPreferencesJson,
              a.capabilities_json AS capabilitiesJson, a.scopes_json AS scopesJson,
              a.connection_owner_user_id AS ownerUserId, a.last_synced_at AS lastSyncedAt,
              a.last_error_code AS lastErrorCode, a.last_error_message AS lastErrorMessage,
              a.created_at AS createdAt,
              (SELECT count(*) FROM profile_links l
                WHERE l.connected_account_id = a.id AND l.is_active = 1) AS publicLinkCount,
              (SELECT j.status FROM sync_jobs j WHERE j.connected_account_id = a.id
                ORDER BY j.created_at DESC LIMIT 1) AS latestSyncStatus,
              (SELECT COALESCE(j.completed_at, j.started_at, j.created_at) FROM sync_jobs j
                WHERE j.connected_account_id = a.id ORDER BY j.created_at DESC LIMIT 1) AS latestSyncAt
         FROM connected_accounts a
        WHERE a.profile_id = ?1
        ORDER BY CASE a.connection_status WHEN 'reconnect_required' THEN 0 WHEN 'connected' THEN 1 ELSE 2 END,
                 COALESCE(a.display_name, a.provider_handle, a.provider), a.created_at`,
    )
    .bind(profileId)
    .all<ConnectionRow>();

  return (rows.results ?? []).map((row) => {
    const preferences = readJson(row.syncPreferencesJson, {});
    const parsedScopes = readJson(row.scopesJson, []);
    const preferenceRecord =
      preferences && typeof preferences === 'object'
        ? (preferences as Record<string, unknown>)
        : {};
    return {
      ...row,
      status: connectionStatusSchema.catch('pending').parse(row.status),
      tokenHealth: tokenHealthSchema.catch('unknown').parse(row.tokenHealth),
      syncMode: syncModeSchema.catch('manual').parse(row.syncMode),
      approvalRequired: preferenceRecord.approvalRequired === true,
      selectedFields: Array.isArray(preferenceRecord.fields)
        ? preferenceRecord.fields.filter((field): field is string => typeof field === 'string')
        : [],
      capabilities: parseCapabilities(row.capabilitiesJson),
      scopes: (Array.isArray(parsedScopes) ? parsedScopes : []).filter(
        (scope: unknown): scope is string => typeof scope === 'string',
      ),
    };
  });
}
