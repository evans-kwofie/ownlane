import { authenticateRequest, type AuthFailure, type VerifiedKey } from './keys.server';
import type { Scope } from './scopes';

/**
 * The shape every `/v0` endpoint shares.
 *
 * Authentication, scope checking, workspace resolution and error shape all live
 * here rather than in each route, so an endpoint cannot accidentally be written
 * without them — the only way to read data is through a handler that has
 * already been given a verified key.
 *
 * `/v0` is unstable on purpose. Shipping `/v1` owes compatibility to every
 * integrator from that day, and the profile shape is still moving.
 */

const FAILURES: Record<AuthFailure, { status: number; code: string; message: string }> = {
  missing: {
    status: 401,
    code: 'missing_token',
    message: 'Send your key as: Authorization: Bearer olk_live_…',
  },
  unknown: { status: 401, code: 'invalid_token', message: 'That key is not recognised.' },
  revoked: { status: 401, code: 'revoked_token', message: 'That key has been revoked.' },
  expired: { status: 401, code: 'expired_token', message: 'That key has expired.' },
  forbidden: {
    status: 403,
    code: 'insufficient_scope',
    message: 'This key does not carry the scope required for that.',
  },
};

export function apiError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function apiOk(data: unknown, extra?: Record<string, unknown>) {
  return Response.json(
    { data, ...extra },
    {
      headers: {
        // Responses are workspace-scoped and key-authenticated; a shared cache
        // must never hold one.
        'Cache-Control': 'private, no-store',
      },
    },
  );
}

/**
 * Resolves a request into a verified key and the workspace it may read, or the
 * response that should be returned instead.
 */
export async function authorize(
  env: Env,
  request: Request,
  params: { workspace?: string },
  scope: Scope,
): Promise<{ ok: true; key: VerifiedKey; profileId: string } | { ok: false; response: Response }> {
  const result = await authenticateRequest(env, request, scope);
  if (!result.ok) {
    const failure = FAILURES[result.reason];
    return {
      ok: false,
      response: apiError(failure.status, failure.code, failure.message),
    };
  }

  const slug = params.workspace ?? '';
  const row = await env.DB.prepare(
    `SELECT w.id AS workspace_id, p.id AS profile_id
       FROM workspaces w
       LEFT JOIN profiles p ON p.workspace_id = w.id
      WHERE w.slug = ?1`,
  )
    .bind(slug)
    .first<{ workspace_id: string; profile_id: string | null }>();

  // The key names the workspace it may read; the URL does not get a say. A key
  // for one workspace pointed at another's slug is a 404, not a 403 — there is
  // no reason to confirm that the other workspace exists.
  if (!row || row.workspace_id !== result.key.workspaceId || !row.profile_id) {
    return { ok: false, response: apiError(404, 'not_found', 'No such workspace.') };
  }

  return { ok: true, key: result.key, profileId: row.profile_id };
}
