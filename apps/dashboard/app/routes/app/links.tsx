import { getAuth } from '@clerk/react-router/server';
import { data } from 'react-router';

import {
  createProfileLink,
  deleteLinkCollection,
  deleteProfileLink,
  reorderLinkCollections,
  reorderProfileLinks,
  saveLinkCollection,
  updateProfileLink,
} from '../../features/links/actions.server';
import { LinksWorkspace } from '../../components/features/links/links-workspace';
import {
  listConnectedAccountLinkSuggestions,
  listLinkCollections,
  listProfileLinks,
} from '../../features/links/queries.server';
import { linkFieldErrors, linkSchema } from '../../features/links/schema';
import { listAssets, storeImage } from '../../lib/assets.server';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/links';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Links — Ownlane' }];
}

async function resolveContext(args: Route.LoaderArgs | Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  return { env, workspace, profile };
}

export async function loader(args: Route.LoaderArgs) {
  const { env, workspace, profile } = await resolveContext(args);
  const [links, collections, assets, connections] = await Promise.all([
    listProfileLinks(env.DB, profile.id),
    listLinkCollections(env.DB, profile.id),
    listAssets(env.DB, workspace.id),
    listConnectedAccountLinkSuggestions(env.DB, profile.id),
  ]);
  return { links, collections, assets, connections };
}

export async function action(args: Route.ActionArgs) {
  const { env, workspace, profile } = await resolveContext(args);
  const form = await args.request.formData();
  const intent = String(form.get('intent'));
  if (intent === 'save-link') {
    const deleteId = String(form.get('deleteLinkId') ?? '');
    if (deleteId)
      return (await deleteProfileLink(env.DB, profile.id, deleteId))
        ? { saved: 'Link deleted' }
        : data({ error: 'That link no longer exists.' }, { status: 404 });
    let thumbnailAssetId = String(form.get('thumbnailAssetId') ?? '') || null;
    const file = form.get('thumbnail');
    if (file instanceof File && file.size) {
      const stored = await storeImage(env, { workspaceId: workspace.id, file, kind: 'image' });
      if (stored.error || !stored.asset)
        return data({ error: stored.error ?? 'Thumbnail upload failed.' }, { status: 400 });
      thumbnailAssetId = stored.asset.id;
    } else if (thumbnailAssetId) {
      const asset = await env.DB.prepare(
        "SELECT id FROM assets WHERE id = ?1 AND workspace_id = ?2 AND content_type LIKE 'image/%'",
      )
        .bind(thumbnailAssetId, workspace.id)
        .first();
      if (!asset)
        return data({ error: 'That thumbnail is not in this asset library.' }, { status: 400 });
    }
    const collectionId = String(form.get('collectionId') ?? '') || null;
    if (collectionId) {
      const collection = await env.DB.prepare(
        'SELECT id FROM link_collections WHERE id = ?1 AND profile_id = ?2',
      )
        .bind(collectionId, profile.id)
        .first();
      if (!collection) return data({ error: 'That section no longer exists.' }, { status: 400 });
    }
    const connectedAccountId = String(form.get('connectedAccountId') ?? '') || null;
    if (connectedAccountId) {
      const account = await env.DB.prepare(
        'SELECT id FROM connected_accounts WHERE id = ?1 AND profile_id = ?2',
      )
        .bind(connectedAccountId, profile.id)
        .first();
      if (!account)
        return data({ error: 'That connected account is no longer available.' }, { status: 400 });
    }
    const parsed = linkSchema.safeParse({
      label: form.get('label'),
      url: form.get('url'),
      publicationStatus: form.get('publicationStatus'),
      startsAt: form.get('startsAt') || undefined,
      endsAt: form.get('endsAt') || undefined,
      thumbnailAssetId,
      collectionId,
      platformKey: String(form.get('platformKey') ?? '') || null,
      connectedAccountId,
    });
    if (!parsed.success)
      return data({ fieldErrors: linkFieldErrors(parsed.error) }, { status: 400 });
    const linkId = String(form.get('linkId') ?? '');
    if (linkId)
      return (await updateProfileLink(env.DB, profile.id, linkId, parsed.data))
        ? { saved: 'Link updated' }
        : data({ error: 'That link no longer exists.' }, { status: 404 });
    await createProfileLink(env.DB, profile.id, parsed.data);
    return { saved: 'Link added' };
  }
  if (intent === 'save-collection') {
    const deleteId = String(form.get('deleteCollectionId') ?? '');
    if (deleteId)
      return (await deleteLinkCollection(env.DB, profile.id, deleteId))
        ? { saved: 'Section deleted; its links moved to Featured links' }
        : data({ error: 'That section no longer exists.' }, { status: 404 });
    const title = String(form.get('title') ?? '').trim();
    if (!title || title.length > 80)
      return data({ error: 'Use a section title between 1 and 80 characters.' }, { status: 400 });
    const id = await saveLinkCollection(env.DB, profile.id, {
      id: String(form.get('collectionId') ?? '') || undefined,
      title,
      description: String(form.get('description') ?? '')
        .trim()
        .slice(0, 180),
      layout: ['list', 'grid', 'compact'].includes(String(form.get('layout')))
        ? (String(form.get('layout')) as 'list' | 'grid' | 'compact')
        : 'list',
      isActive: form.get('isActive') === 'on',
    });
    return id
      ? { saved: 'Section saved' }
      : data({ error: 'That section no longer exists.' }, { status: 404 });
  }
  if (intent === 'reorder-links' || intent === 'reorder-collections') {
    let payload: unknown;
    try {
      payload = JSON.parse(String(form.get(intent === 'reorder-links' ? 'items' : 'ids') ?? '[]'));
    } catch {
      return data({ error: 'Invalid order.' }, { status: 400 });
    }
    if (!Array.isArray(payload)) return data({ error: 'Invalid order.' }, { status: 400 });
    const saved =
      intent === 'reorder-links'
        ? await reorderProfileLinks(
            env.DB,
            profile.id,
            payload.map((item) => ({
              id: String((item as { id?: unknown }).id ?? ''),
              collectionId: (() => {
                const value = (item as { collectionId?: unknown }).collectionId;
                return value === null || value === undefined || value === '' ? null : String(value);
              })(),
            })),
          )
        : await reorderLinkCollections(env.DB, profile.id, payload.map(String));
    return saved
      ? { saved: 'Order updated' }
      : data({ error: 'The order could not be saved.' }, { status: 400 });
  }
  return data({ error: 'Unknown link action.' }, { status: 400 });
}

export default function Links({ loaderData }: Route.ComponentProps) {
  return <LinksWorkspace {...loaderData} />;
}
