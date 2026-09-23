import { getAuth } from '@clerk/react-router/server';
import { data } from 'react-router';

import { AudienceWorkspace } from '../../components/features/audience/audience-workspace';
import {
  addLeadNote,
  addLeadTag,
  deleteLeadNote,
  eraseLead,
  markLeadRead,
  removeLeadTag,
  setLeadStatus,
  saveContactFormSettings,
  tagLeads,
} from '../../features/audience/actions.server';
import {
  audienceFilter,
  readAudience,
  readContactFormSettings,
  readLead,
} from '../../features/audience/queries.server';
import { LEAD_STATUSES, type LeadStatus } from '../../features/audience/schema';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/audience';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Audience — Ownlane' }];
}

async function resolveContext(args: Route.LoaderArgs | Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  return { env, userId, workspace, profile };
}

export async function loader(args: Route.LoaderArgs) {
  const { env, profile, workspace } = await resolveContext(args);
  const url = new URL(args.request.url);
  const filter = audienceFilter(url.searchParams);

  // The open lead comes from the URL, so a reload keeps your place and a
  // pasted link opens on the lead it names.
  const openId = url.searchParams.get('lead');
  const [overview, namedLead, settings] = await Promise.all([
    readAudience(env.DB, profile.id, filter),
    openId ? readLead(env.DB, profile.id, openId) : Promise.resolve(null),
    readContactFormSettings(env.DB, profile.id),
  ]);

  // With nothing named, open the newest lead rather than showing an empty
  // panel beside a full list. A named id that no longer resolves is left
  // unresolved instead — quietly showing a different lead would be worse.
  const lead =
    namedLead ??
    (!openId && overview.leads[0]
      ? await readLead(env.DB, profile.id, overview.leads[0].id)
      : null);

  return {
    filter,
    overview,
    lead,
    settings,
    turnstileConfigured: Boolean(env.VITE_TURNSTILE_SITE_KEY),
    // Public by design: it identifies the server to the push service.
    vapidPublicKey: env.VITE_VAPID_PUBLIC_KEY,
    openedLeadId: openId,
  };
}

export async function action(args: Route.ActionArgs) {
  const { env, userId, profile, workspace } = await resolveContext(args);
  const form = await args.request.formData();
  const intent = String(form.get('intent'));

  if (intent === 'save-form') {
    const result = await saveContactFormSettings(env.DB, profile.id, {
      ...Object.fromEntries(form),
      // An unchecked switch submits an empty string, which is the "off" we want.
      isEnabled: Boolean(form.get('isEnabled')),
      askSubject: Boolean(form.get('askSubject')),
      askPhone: Boolean(form.get('askPhone')),
      notifyOwner: Boolean(form.get('notifyOwner')),
    });
    return result.ok ? { saved: 'Form settings saved' } : data(result, { status: 400 });
  }

  if (intent === 'set-status') {
    const status = String(form.get('status'));
    if (!LEAD_STATUSES.includes(status as LeadStatus)) {
      return data({ error: 'Unknown status.' }, { status: 400 });
    }
    const result = await setLeadStatus(env.DB, profile.id, {
      leadIds: form.getAll('leadId').map(String),
      status: status as LeadStatus,
    });
    return result.ok ? { saved: `Moved to ${status}` } : data(result, { status: 400 });
  }

  if (intent === 'add-note') {
    const result = await addLeadNote(env.DB, profile.id, userId, {
      leadId: String(form.get('leadId') ?? ''),
      body: String(form.get('body') ?? ''),
    });
    return result.ok ? { saved: 'Note added' } : data(result, { status: 400 });
  }

  if (intent === 'delete-note') {
    await deleteLeadNote(env.DB, profile.id, String(form.get('noteId') ?? ''));
    return { saved: 'Note deleted' };
  }

  if (intent === 'mark-read') {
    await markLeadRead(env.DB, profile.id, String(form.get('leadId') ?? ''));
    return { saved: 'Marked read' };
  }

  if (intent === 'erase-lead') {
    const result = await eraseLead(env.DB, profile.id, userId, String(form.get('leadId') ?? ''));
    return result.ok ? { saved: 'Lead permanently deleted' } : data(result, { status: 400 });
  }

  if (intent === 'add-tag') {
    const leadIds = form.getAll('leadId').map(String);
    const tag = String(form.get('tag') ?? '');
    const result =
      leadIds.length > 1
        ? await tagLeads(env.DB, profile.id, { leadIds, tag })
        : await addLeadTag(env.DB, profile.id, { leadId: leadIds[0] ?? '', tag });
    return result.ok ? { saved: 'Tagged' } : data(result, { status: 400 });
  }

  if (intent === 'remove-tag') {
    await removeLeadTag(env.DB, profile.id, {
      leadId: String(form.get('leadId') ?? ''),
      tag: String(form.get('tag') ?? ''),
    });
    return { saved: 'Tag removed' };
  }

  return data({ error: 'Unknown action.' }, { status: 400 });
}

export default function Audience({ loaderData }: Route.ComponentProps) {
  return <AudienceWorkspace {...loaderData} />;
}
