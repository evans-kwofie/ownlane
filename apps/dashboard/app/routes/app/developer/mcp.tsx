import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import { McpPanel } from '../../../components/features/developer/mcp-panel';
import { MCP_TOOLS } from '../../../features/api/mcp.server';
import { cloudflare } from '../../../lib/cloudflare';
import { getWorkspaceForUser } from '../../../lib/workspaces.server';
import type { Route } from './+types/mcp';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'AI & MCP — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  return {
    serverUrl: `${env.PUBLIC_SITE_ORIGIN?.trim() || new URL(args.request.url).origin}/mcp`,
    tools: MCP_TOOLS,
  };
}

export default function Mcp({ loaderData }: Route.ComponentProps) {
  return <McpPanel serverUrl={loaderData.serverUrl} tools={loaderData.tools} />;
}
