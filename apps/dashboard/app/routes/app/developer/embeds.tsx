import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';

import { EmbedsPanel } from '../../../components/features/developer/embeds-panel';
import { readContactFormSettings } from '../../../features/audience/queries.server';
import { cloudflare } from '../../../lib/cloudflare';
import { readProfile } from '../../../lib/profiles.server';
import { getWorkspaceForUser } from '../../../lib/workspaces.server';
import type { Route } from './+types/embeds';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Embeds — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');
  const profile = await readProfile(env.DB, workspace.id);

  return {
    slug: workspace.slug,
    origin: env.PUBLIC_SITE_ORIGIN?.trim() || new URL(args.request.url).origin,
    isPublic: profile?.visibility === 'public',
    contactFormEnabled: profile
      ? (await readContactFormSettings(env.DB, profile.id)).isEnabled
      : false,
  };
}

export default function Embeds({ loaderData }: Route.ComponentProps) {
  return <EmbedsPanel {...loaderData} />;
}
