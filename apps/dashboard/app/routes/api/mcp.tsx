import { handleMcpRequest } from '../../features/api/mcp.server';
import { cloudflare } from '../../lib/cloudflare';
import type { Route } from './+types/mcp';

/** POST /mcp — the remote MCP endpoint an AI client connects to. */
export async function action(args: Route.ActionArgs) {
  const { env } = args.context.get(cloudflare);
  return handleMcpRequest(env, args.request);
}

/** A GET here is almost always someone pasting the URL into a browser. */
export function loader() {
  return Response.json(
    {
      name: 'ownlane',
      transport: 'http',
      hint: 'This is an MCP endpoint. Point an MCP client at it and send an Ownlane API key as a bearer token.',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
