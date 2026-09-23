import { getAuth } from '@clerk/react-router/server';
import { data, redirect } from 'react-router';

import { cloudflare } from '../../lib/cloudflare';
import { createWorkspace } from '../../lib/workspaces.server';
import { toSlug } from '../../lib/workspaces';
import type { Route } from './+types/create-brand';

const MAX_NAME = 60;

/**
 * Action-only route: creates a second identity for this account. It has no
 * page of its own — the dialog that posts here stays where the user was.
 */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const form = await args.request.formData();
  const name = String(form.get('name') ?? '').trim();

  if (!name) return data({ error: 'Give the brand a name.' }, { status: 400 });
  if (name.length > MAX_NAME) {
    return data({ error: `Keep the name under ${MAX_NAME} characters.` }, { status: 400 });
  }

  const { env } = args.context.get(cloudflare);

  try {
    const workspace = await createWorkspace(env.DB, {
      userId,
      name,
      kind: 'brand',
      preferredSlug: toSlug(name),
    });

    return { slug: workspace.slug };
  } catch (error) {
    // Surface the cause rather than hiding it behind a generic message: a
    // failure here is a bug in our write, not something the user did wrong.
    console.error('createWorkspace failed', error);

    return data(
      { error: error instanceof Error ? error.message : 'We could not create that brand.' },
      { status: 500 },
    );
  }
}
