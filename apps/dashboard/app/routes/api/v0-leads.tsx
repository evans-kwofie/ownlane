import { authorize, apiOk } from '../../features/api/respond.server';
import { cloudflare } from '../../lib/cloudflare';
import type { Route } from './+types/v0-leads';

const PAGE_SIZE = 50;

/**
 * GET /v0/workspaces/:workspace/leads?status=&cursor=
 *
 * The only endpoint that returns personal data, behind its own `leads:read`
 * scope. `visitor_hash` is never included: it is an internal identifier for
 * counting, not something to hand to a third party.
 *
 * The consent wording each person agreed to travels with their record, so a
 * receiving system can honour it rather than having to assume.
 */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const auth = await authorize(env, args.request, args.params, 'leads:read');
  if (!auth.ok) return auth.response;

  const url = new URL(args.request.url);
  const status = url.searchParams.get('status');
  const cursor = url.searchParams.get('cursor');

  const rows = await env.DB.prepare(
    `SELECT id, name, email, phone, subject, message, status, created_at,
            utm_source, utm_medium, utm_campaign, country_code,
            consent_text, consented_at
       FROM leads
      WHERE profile_id = ?1
        AND (?2 IS NULL OR status = ?2)
        AND (?3 IS NULL OR created_at < ?3)
      ORDER BY created_at DESC
      LIMIT ${PAGE_SIZE + 1}`,
  )
    .bind(auth.profileId, status, cursor)
    .all<Record<string, string | null>>();

  const all = rows.results ?? [];
  const page = all.slice(0, PAGE_SIZE);
  const nextCursor = all.length > PAGE_SIZE ? page[page.length - 1]?.created_at : null;

  return apiOk(
    page.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      source: {
        utm_source: row.utm_source,
        utm_medium: row.utm_medium,
        utm_campaign: row.utm_campaign,
        country: row.country_code,
      },
      consent: { text: row.consent_text, at: row.consented_at },
    })),
    { next_cursor: nextCursor ?? null },
  );
}
