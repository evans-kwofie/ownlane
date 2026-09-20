import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';
import { connectTwitchAccount, twitchIsConfigured } from '../features/connections/twitch.server';
import { cloudflare } from '../lib/cloudflare';
import { getWorkspaceForUser } from '../lib/workspaces.server';
import type { Route } from './+types/oauth.twitch.callback';
type State={userId:string;workspaceId:string;workspaceSlug:string;profileId:string;expiresAt:number};
export async function loader(args: Route.LoaderArgs) { const {userId}=await getAuth(args); if(!userId) throw redirect('/'); const {env}=args.context.get(cloudflare); const url=new URL(args.request.url); const key=url.searchParams.get('state'); const state=key?await env.OAUTH_STATE.get<State>(`twitch:${key}`,'json'):null; if(key) await env.OAUTH_STATE.delete(`twitch:${key}`); if(!state||state.userId!==userId||state.expiresAt<Date.now()||!url.searchParams.get('code')||!twitchIsConfigured(env)) throw redirect('/app'); const workspace=await getWorkspaceForUser(env.DB,userId,state.workspaceSlug); if(!workspace||workspace.id!==state.workspaceId) throw redirect('/app'); try { await connectTwitchAccount(env,{code:url.searchParams.get('code')!,redirectUri:new URL('/oauth/callback/twitch',args.request.url).toString(),profileId:state.profileId,userId}); } catch(error){console.error('Twitch OAuth callback failed',error); throw redirect(`/app/${state.workspaceSlug}/connections/new?oauth_error=twitch_connection_failed`); } throw redirect(`/app/${state.workspaceSlug}/connections?connected=twitch`); }
