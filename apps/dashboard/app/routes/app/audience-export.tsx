import { getAuth } from '@clerk/react-router/server';

import { csvHeader, csvRow } from '../../features/audience/csv';
import { readLeadsForExportPage } from '../../features/audience/queries.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/audience-export';

const COLUMNS = [
  'created_at',
  'name',
  'email',
  'phone',
  'subject',
  'message',
  'status',
  'tags',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'referrer_host',
  'country_code',
  'device_type',
  'consent_text',
  'consented_at',
];

/**
 * The whole inbox as a file, consent wording included — an export that drops
 * what someone agreed to is not a record worth keeping.
 */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });

  const filename = `ownlane-leads-${workspace.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(csvHeader(COLUMNS)));
      let after: { createdAt: string; id: string } | undefined;
      try {
        while (true) {
          const page = await readLeadsForExportPage(env.DB, profile.id, after);
          const rows = page.results ?? [];
          for (const row of rows) {
            const tags = row.tags ? JSON.parse(row.tags) : [];
            controller.enqueue(encoder.encode(csvRow({ ...row, tags: Array.isArray(tags) ? tags.join(' ') : '' }, COLUMNS)));
          }
          if (rows.length < 100) break;
          const last = rows.at(-1);
          if (!last?.created_at || !last.id) break;
          after = { createdAt: last.created_at, id: last.id };
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
