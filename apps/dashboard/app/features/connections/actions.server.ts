import type { ConnectionPreferences } from './schema';

export async function updateConnectionPreferences(
  db: D1Database,
  profileId: string,
  accountId: string,
  preferences: ConnectionPreferences,
) {
  const result = await db
    .prepare(
      `UPDATE connected_accounts
          SET sync_mode = ?3,
              sync_preferences_json = ?4,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1 AND profile_id = ?2 AND connection_status = 'connected'`,
    )
    .bind(
      accountId,
      profileId,
      preferences.syncMode,
      JSON.stringify({
        approvalRequired: preferences.approvalRequired,
        fields: preferences.fields,
      }),
    )
    .run();
  return result.meta.changes > 0;
}

/** Revokes Ownlane's local authorization while preserving the audit record. */
export async function disconnectAccount(db: D1Database, profileId: string, accountId: string) {
  const account = await db
    .prepare('SELECT id FROM connected_accounts WHERE id = ?1 AND profile_id = ?2')
    .bind(accountId, profileId)
    .first<{ id: string }>();
  if (!account) return false;

  await db.batch([
    db
      .prepare('DELETE FROM connected_account_credentials WHERE connected_account_id = ?1')
      .bind(accountId),
    db
      .prepare(
        `UPDATE connected_accounts
            SET connection_status = 'revoked', token_health = 'missing', sync_mode = 'off',
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?1 AND profile_id = ?2`,
      )
      .bind(accountId, profileId),
  ]);
  return true;
}

export async function deleteConnectionRecord(db: D1Database, profileId: string, accountId: string) {
  const result = await db
    .prepare('DELETE FROM connected_accounts WHERE id = ?1 AND profile_id = ?2')
    .bind(accountId, profileId)
    .run();
  return result.meta.changes > 0;
}

export async function clearConnectionError(db: D1Database, profileId: string, accountId: string) {
  const result = await db
    .prepare(
      `UPDATE connected_accounts
          SET last_error_code = NULL, last_error_message = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1 AND profile_id = ?2`,
    )
    .bind(accountId, profileId)
    .run();
  return result.meta.changes > 0;
}
