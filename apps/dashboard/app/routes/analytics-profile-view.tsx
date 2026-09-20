import { cloudflare } from '../lib/cloudflare';
import { isFirstPartyRequest, recordAnalyticsEvent } from '../features/analytics/events.server';
import type { Route } from './+types/analytics-profile-view';

export async function action(args: Route.ActionArgs) {
  if (!isFirstPartyRequest(args.request)) {
    throw new Response('Forbidden', { status: 403 });
  }

  const { env } = args.context.get(cloudflare);
  const profile = await env.DB.prepare(
    `SELECT p.id
       FROM profiles p
       JOIN workspaces w ON w.id = p.workspace_id
      WHERE w.slug = ?1 AND p.visibility = 'public'`,
  )
    .bind(args.params.slug)
    .first<{ id: string }>();

  if (!profile) throw new Response('Not found', { status: 404 });

  const result = await recordAnalyticsEvent(env, args.request, {
    profileId: profile.id,
    type: 'profile_view',
  });
  return new Response(null, {
    status: 204,
    headers: result.setCookie ? { 'Set-Cookie': result.setCookie } : undefined,
  });
}
