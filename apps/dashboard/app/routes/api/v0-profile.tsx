import { authorize, apiOk } from '../../features/api/respond.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import type { Route } from './+types/v0-profile';

/** GET /v0/workspaces/:workspace/profile */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);
  const auth = await authorize(env, args.request, args.params, 'profile:read');
  if (!auth.ok) return auth.response;

  const workspaceRow = await env.DB.prepare(`SELECT workspace_id FROM profiles WHERE id = ?1`)
    .bind(auth.profileId)
    .first<{ workspace_id: string }>();
  const profile = workspaceRow ? await readProfile(env.DB, workspaceRow.workspace_id) : null;
  if (!profile) return apiOk(null);

  // Explicit field list rather than spreading the row: a column added later
  // must be a deliberate decision to publish, not an accident.
  return apiOk({
    id: profile.id,
    handle: profile.handle,
    display_name: profile.displayName,
    short_bio: profile.shortBio,
    medium_bio: profile.mediumBio,
    long_bio: profile.longBio,
    profession: profile.profession,
    categories: profile.categories,
    skills: profile.skills,
    location: profile.location,
    timezone: profile.timezone,
    pronouns: profile.pronouns,
    website_url: profile.websiteUrl,
    avatar_id: profile.avatarKey || null,
    cover_id: profile.coverKey || null,
    visibility: profile.visibility,
  });
}
