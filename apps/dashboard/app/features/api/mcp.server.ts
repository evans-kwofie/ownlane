import { authenticateRequest } from './keys.server';
import type { Scope } from './scopes';

/**
 * A remote MCP server, so an AI client can read a workspace.
 *
 * MCP is JSON-RPC 2.0 over HTTP POST. The whole surface is implemented here
 * rather than pulled in as a dependency: it is four methods, and a Worker
 * should not carry a transport library to answer them.
 *
 * Every tool is read-only and gated on the same scopes as the REST API, so
 * there is one permission model rather than two. Leads are behind their own
 * scope and are never reachable by a key that was not explicitly granted it —
 * an agent with broad read access to a workspace would otherwise be able to
 * exfiltrate every customer who ever made contact.
 *
 * The workspace comes from the key, never from an argument the model supplies.
 */

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type Tool = {
  name: string;
  scope: Scope;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (env: Env, profileId: string, args: Record<string, unknown>) => Promise<unknown>;
};

const noArgs = { type: 'object', properties: {}, additionalProperties: false } as const;

const TOOLS: Tool[] = [
  {
    name: 'get_profile',
    scope: 'profile:read',
    description:
      'The canonical identity profile: name, handle, bios, profession, location and links to it.',
    inputSchema: noArgs,
    run: async (env, profileId) => {
      const row = await env.DB.prepare(
        `SELECT handle, display_name, short_bio, medium_bio, long_bio, profession,
                categories, skills, location, timezone, website_url, visibility
           FROM profiles WHERE id = ?1`,
      )
        .bind(profileId)
        .first();
      return row ?? {};
    },
  },
  {
    name: 'list_links',
    scope: 'links:read',
    description: 'Every link published on the profile, in the order a visitor sees them.',
    inputSchema: noArgs,
    run: async (env, profileId) => {
      const rows = await env.DB.prepare(
        `SELECT label, url, platform_key FROM profile_links
          WHERE profile_id = ?1 AND is_active = 1 ORDER BY position`,
      )
        .bind(profileId)
        .all();
      return rows.results ?? [];
    },
  },
  {
    name: 'list_content',
    scope: 'content:read',
    description: 'Work imported from connected platforms, featured items first.',
    inputSchema: noArgs,
    run: async (env, profileId) => {
      const rows = await env.DB.prepare(
        `SELECT title, description, url, kind, provider, published_at, is_featured
           FROM content_items WHERE profile_id = ?1
          ORDER BY is_featured DESC, published_at DESC LIMIT 50`,
      )
        .bind(profileId)
        .all();
      return rows.results ?? [];
    },
  },
  {
    name: 'get_analytics',
    scope: 'analytics:read',
    description:
      'Aggregate profile performance over a date range: views, clicks, sources, countries, devices.',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'YYYY-MM-DD. Defaults to 30 days ago.' },
        end: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
      },
      additionalProperties: false,
    },
    run: async (env, profileId, args) => {
      const { analyticsDateRange, readAnalyticsOverview } = await import(
        '../analytics/queries.server'
      );
      const search = new URLSearchParams();
      if (typeof args.start === 'string') search.set('start', args.start);
      if (typeof args.end === 'string') search.set('end', args.end);
      const range = analyticsDateRange(search);
      const overview = await readAnalyticsOverview(env.DB, profileId, range);
      return {
        range,
        views: overview.views,
        unique_visitors: overview.uniqueVisitors,
        outbound_clicks: overview.outboundClicks,
        click_through_rate: overview.clickThroughRate,
        sources: overview.acquisition,
        countries: overview.countries,
        devices: overview.devices,
      };
    },
  },
  {
    name: 'get_audience_summary',
    scope: 'audience:read',
    description:
      'How many people have made contact and where they came from. Counts only — no personal details.',
    inputSchema: noArgs,
    run: async (env, profileId) => {
      const row = await env.DB.prepare(
        `SELECT count(*) AS total,
                count(CASE WHEN status = 'new' THEN 1 END) AS unanswered,
                count(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 END) AS last_30_days
           FROM leads WHERE profile_id = ?1 AND status <> 'spam'`,
      )
        .bind(profileId)
        .first();
      return row ?? {};
    },
  },
  {
    name: 'list_leads',
    scope: 'leads:read',
    description:
      'People who contacted you, with their messages. Personal data — only available to a key explicitly granted leads:read.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['new', 'replied', 'won', 'archived'] },
        limit: { type: 'number', description: 'Up to 25.' },
      },
      additionalProperties: false,
    },
    run: async (env, profileId, args) => {
      const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
      const status = typeof args.status === 'string' ? args.status : null;
      const rows = await env.DB.prepare(
        `SELECT name, email, subject, message, status, created_at
           FROM leads
          WHERE profile_id = ?1 AND status <> 'spam' AND (?2 IS NULL OR status = ?2)
          ORDER BY created_at DESC LIMIT ${limit}`,
      )
        .bind(profileId, status)
        .all();
      return rows.results ?? [];
    },
  },
];

const SERVER_INFO = { name: 'ownlane', version: '0.1.0' };

export async function handleMcpRequest(env: Env, request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonRpcError(null, -32600, 'MCP requires POST.');
  }

  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body?.method) return jsonRpcError(null, -32600, 'Not a JSON-RPC request.');

  const id = body.id ?? null;

  // `initialize` is answered before authenticating so a client can discover the
  // server and be told clearly that it needs a key, rather than failing opaquely.
  if (body.method === 'initialize') {
    return jsonRpc(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (body.method === 'notifications/initialized') return new Response(null, { status: 204 });

  // Every remaining method needs a key. `profile:read` is the floor: a key with
  // nothing granted can see nothing, not even the tool list.
  const auth = await authenticateRequest(env, request, 'profile:read');
  if (!auth.ok) {
    return jsonRpcError(id, -32001, 'Provide an Ownlane API key with profile:read as a bearer token.');
  }

  const profile = await env.DB.prepare(`SELECT id FROM profiles WHERE workspace_id = ?1`)
    .bind(auth.key.workspaceId)
    .first<{ id: string }>();
  if (!profile) return jsonRpcError(id, -32002, 'That key has no profile to read.');

  // A client only ever sees the tools its key can actually call, so it cannot
  // plan around a capability it will then be refused.
  const available = TOOLS.filter((tool) => auth.key.scopes.includes(tool.scope));

  if (body.method === 'tools/list') {
    return jsonRpc(id, {
      tools: available.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
  }

  if (body.method === 'resources/list') {
    return jsonRpc(id, { resources: [] });
  }

  if (body.method === 'tools/call') {
    const name = String(body.params?.name ?? '');
    const tool = available.find((candidate) => candidate.name === name);
    if (!tool) {
      return jsonRpc(id, {
        isError: true,
        content: [{ type: 'text', text: `No tool "${name}" is available to this key.` }],
      });
    }

    try {
      const result = await tool.run(
        env,
        profile.id,
        (body.params?.arguments as Record<string, unknown>) ?? {},
      );
      return jsonRpc(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    } catch {
      return jsonRpc(id, {
        isError: true,
        content: [{ type: 'text', text: 'That tool could not be run.' }],
      });
    }
  }

  return jsonRpcError(id, -32601, `Unknown method "${body.method}".`);
}

function jsonRpc(id: string | number | null, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'no-store' } });
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return Response.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** Tool names and the scope each needs, for the setup instructions. */
export const MCP_TOOLS = TOOLS.map((tool) => ({
  name: tool.name,
  scope: tool.scope,
  description: tool.description,
}));
