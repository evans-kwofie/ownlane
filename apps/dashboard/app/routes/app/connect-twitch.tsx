import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';
import { buildTwitchAuthorizationUrl, twitchIsConfigured } from '../../features/connections/twitch.server';
import { cloudflare } from '../../lib/cloudflare';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/connect-twitch';
export async function loader(args: Route.LoaderArgs) { const { userId } = await getAuth(args); if (!userId) throw redirect('/'); const { env } = args.context.get(cloudflare); const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace); if (!workspace || !twitchIsConfigured(env)) throw redirect('/app'); const profile = await env.DB.prepare('SELECT id FROM profiles WHERE workspace_id=?1').bind(workspace.id).first<{id:string}>(); if (!profile) throw redirect('/app'); const state=crypto.randomUUID(); await env.OAUTH_STATE.put(`twitch:${state}`, JSON.stringify({userId,workspaceId:workspace.id,workspaceSlug:workspace.slug,profileId:profile.id,expiresAt:Date.now()+600000}), {expirationTtl:600}); throw redirect(buildTwitchAuthorizationUrl({clientId:env.TWITCH_CLIENT_ID,redirectUri:new URL('/oauth/callback/twitch',args.request.url).toString(),state})); }
