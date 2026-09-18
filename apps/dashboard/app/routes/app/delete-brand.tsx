import { getAuth } from '@clerk/react-router/server';
import { data, redirect } from 'react-router';

import { cloudflare } from '../../lib/cloudflare';
import { deleteBrand, getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/delete-brand';

/**
 * Action-only route. The brand's name must be typed back exactly: deleting is
 * irreversible and takes the profile, links, connections and history with it.
 */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const form = await args.request.formData();
  const slug = String(form.get('slug') ?? '');
  const confirmation = String(form.get('confirmation') ?? '').trim();

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, slug);

  if (!workspace)
    return data({ error: 'That brand does not exist, or you cannot reach it.' }, { status: 404 });
  if (confirmation !== workspace.name) {
    return data({ error: 'The name did not match, so nothing was deleted.' }, { status: 400 });
  }

  const { error } = await deleteBrand(env.DB, userId, slug);
  if (error) return data({ error }, { status: 400 });

  return { deleted: workspace.name };
}
