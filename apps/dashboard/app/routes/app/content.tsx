import { getAuth } from '@clerk/react-router/server';
import { data, redirect } from 'react-router';
import { ContentWorkspace } from '../../components/features/content/content-workspace';
import { importContentForAccount } from '../../features/content/import.server';
import { listContentItems } from '../../features/content/queries.server';
import { listConnectedAccounts } from '../../features/connections/queries.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/content';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Content — Ownlane' }];
}

async function context(args: Route.LoaderArgs | Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  return { env, profile };
}

export async function loader(args: Route.LoaderArgs) {
  const { env, profile } = await context(args);
  const [items, accounts] = await Promise.all([
    listContentItems(env.DB, profile.id),
    listConnectedAccounts(env.DB, profile.id),
  ]);
  return { items, accounts };
}

export async function action(args: Route.ActionArgs) {
  const { env, profile } = await context(args);
  const form = await args.request.formData();
  const intent = String(form.get('intent'));
  if (intent === 'import-content') {
    try {
      const count = await importContentForAccount(
        env,
        profile.id,
        String(form.get('accountId') ?? ''),
      );
      return {
        message: count
          ? `${count} ${count === 1 ? 'item' : 'items'} imported`
          : 'No recent public content found',
      };
    } catch (error) {
      return data(
        { error: error instanceof Error ? error.message : 'Content import failed.' },
        { status: 400 },
      );
    }
  }
  if (intent === 'toggle-featured') {
    const result = await env.DB.prepare(
      `UPDATE content_items SET is_featured=CASE WHEN is_featured=1 THEN 0 ELSE 1 END, updated_at=CURRENT_TIMESTAMP WHERE id=?1 AND profile_id=?2`,
    )
      .bind(String(form.get('contentId') ?? ''), profile.id)
      .run();
    return result.meta.changes
      ? { message: 'Featured content updated' }
      : data({ error: 'That content item no longer exists.' }, { status: 404 });
  }
  return data({ error: 'Unknown content action.' }, { status: 400 });
}

export default function Content({ loaderData }: Route.ComponentProps) {
  return <ContentWorkspace {...loaderData} />;
}
