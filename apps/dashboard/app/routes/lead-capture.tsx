import { data } from 'react-router';

import { isFirstPartyRequest } from '../features/analytics/events.server';
import { captureLead } from '../features/audience/capture.server';
import { cloudflare } from '../lib/cloudflare';
import type { Route } from './+types/lead-capture';

/** Bigger than any legitimate submission, small enough to refuse cheaply. */
const MAX_BYTES = 8_192;

export async function action(args: Route.ActionArgs) {
  if (!isFirstPartyRequest(args.request)) throw new Response('Forbidden', { status: 403 });
  if (Number(args.request.headers.get('Content-Length') ?? '0') > MAX_BYTES) {
    throw new Response('Too large', { status: 413 });
  }

  const { env, ctx } = args.context.get(cloudflare);
  const profile = await env.DB.prepare(
    `SELECT p.id, p.workspace_id AS workspaceId, p.display_name AS displayName
       FROM profiles p
       JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.slug = ?1 AND p.visibility = 'public'`,
  )
    .bind(args.params.slug)
    .first<{ id: string; workspaceId: string; displayName: string }>();
  if (!profile) throw new Response('Not found', { status: 404 });

  const result = await captureLead(env, ctx, args.request, {
    profileId: profile.id,
    workspaceId: profile.workspaceId,
    profileName: profile.displayName,
    slug: args.params.slug,
    form: await args.request.formData(),
  });

  if (!result.ok) {
    return data(
      { ok: false as const, formErrors: result.formErrors, message: result.message },
      { status: 400 },
    );
  }
  return data(
    { ok: true as const },
    { headers: result.setCookie ? { 'Set-Cookie': result.setCookie } : undefined },
  );
}
