import { isNameAvailable } from '../features/identity/name-availability.server';
import { cloudflare } from '../lib/cloudflare';
import type { Route } from './+types/name-availability';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

export async function loader(args: Route.LoaderArgs) {
  const requestId = args.request.headers.get('x-request-id') ?? crypto.randomUUID();
  const startedAt = Date.now();
  const { env } = args.context.get(cloudflare);
  const handle = new URL(args.request.url).searchParams.get('handle') ?? '';
  const result = await isNameAvailable(env.DB, handle);

  console.info('[name-availability:dashboard] completed', {
    requestId,
    handle: handle.trim().toLowerCase(),
    ...result,
    durationMs: Date.now() - startedAt,
  });
  return Response.json(result, { headers: { ...CORS, 'X-Request-ID': requestId } });
}
