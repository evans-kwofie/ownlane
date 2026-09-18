import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { Button } from '@ownlane/ui/components/button';
import { toast } from '@ownlane/ui/components/sonner';
import { data, Link, redirect, useBlocker, useFetcher } from 'react-router';

import { ChannelVisibility } from '../../components/channel-visibility';
import { ChoiceRow } from '../../components/choice-row';
import { EditableRow } from '../../components/editable-row';
import { EntryList } from '../../components/entry-list';
import { IdentityCard } from '../../components/identity-card';
import { ImagePicker } from '../../components/image-picker';
import { PageHeader } from '../../components/page-header';
import { ProfileHistory } from '../../components/profile-history';
import { ProfileVisibilityDialog } from '../../components/profile/profile-visibility-dialog';
import { SaveBar } from '../../components/save-bar';
import { VisibilityControl } from '../../components/visibility-control';
import { cloudflare } from '../../lib/cloudflare';
import { listAssets, setProfileImage, storeImage } from '../../lib/assets.server';
import {
  BIO_GUIDANCE,
  CONTACT_CHANNELS,
  PROFILE_CHOICES,
  PROFILE_LIMITS,
  isTextField,
  validateProfile,
  type ContactChannel,
  type CredibilityKind,
  type ProfileField,
} from '../../lib/profiles';
import {
  addCredibility,
  addService,
  cancelScheduledChange,
  readProfileBundle,
  removeRow,
  restoreVersion,
  scheduleChange,
  setContactVisibility,
  updateProfile,
} from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/profile';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Profile — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  const [bundle, assets] = await Promise.all([
    readProfileBundle(env.DB, workspace.id),
    listAssets(env.DB, workspace.id),
  ]);

  return { workspace, bundle, assets };
}

/**
 * One action for the whole module. Everything that changes a profile passes an
 * `intent`, so the page has a single request path rather than a route per verb.
 */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  const bundle = await readProfileBundle(env.DB, workspace.id);
  if (!bundle) return data({ error: 'This workspace has no profile yet.' }, { status: 404 });

  const form = await args.request.formData();
  const intent = String(form.get('intent') ?? 'save');
  const profile = bundle.profile;

  if (intent === 'image') {
    const file = form.get('file');
    if (!(file instanceof File)) return data({ error: 'No image was received.' }, { status: 400 });

    const field = String(form.get('field') ?? 'avatar') as 'avatar' | 'cover' | 'logo';
    const { asset, error } = await storeImage(env, {
      workspaceId: workspace.id,
      file,
      kind: field === 'avatar' ? 'image' : field,
      width: Number(form.get('width')) || undefined,
      height: Number(form.get('height')) || undefined,
    });

    if (error || !asset)
      return data({ error: error ?? 'That image could not be stored.' }, { status: 400 });

    await setProfileImage(env.DB, profile.id, `${field}_key` as 'avatar_key', asset.id);

    return { savedAt: Date.now(), message: 'Image updated' };
  }

  if (intent === 'select-image') {
    const field = String(form.get('field') ?? 'avatar') as 'avatar' | 'cover' | 'logo';
    const assetId = String(form.get('assetId') ?? '');
    if (!['avatar', 'cover', 'logo'].includes(field))
      return data({ error: 'Unknown image slot.' }, { status: 400 });

    const asset = await env.DB.prepare(
      'SELECT id FROM assets WHERE id = ?1 AND workspace_id = ?2 AND content_type LIKE \'image/%\'',
    )
      .bind(assetId, workspace.id)
      .first<{ id: string }>();
    if (!asset) return data({ error: 'That image is not available in this asset library.' }, { status: 404 });

    await setProfileImage(env.DB, profile.id, `${field}_key` as 'avatar_key', asset.id);
    return { savedAt: Date.now(), message: 'Profile image updated' };
  }

  if (intent === 'visibility') {
    const channel = String(form.get('channel')) as ContactChannel;
    if (!CONTACT_CHANNELS.includes(channel))
      return data({ error: 'Unknown contact channel.' }, { status: 400 });

    await setContactVisibility(
      env.DB,
      profile.id,
      channel,
      form.get('public') === 'true' ? 'public' : 'private',
    );

    return { savedAt: Date.now(), message: 'Contact visibility updated' };
  }

  if (intent === 'add-credibility') {
    const kind = String(form.get('kind')) as CredibilityKind;
    const label = String(form.get('label') ?? '').trim();
    if (!label) return data({ error: 'Give it a name.' }, { status: 400 });

    await addCredibility(env.DB, profile.id, {
      kind,
      label,
      url: String(form.get('url') ?? '').trim(),
      issuer: String(form.get('issuer') ?? '').trim(),
    });

    return { savedAt: Date.now(), message: 'Added' };
  }

  if (intent === 'add-service') {
    const name = String(form.get('name') ?? '').trim();
    if (!name) return data({ error: 'Give the service a name.' }, { status: 400 });

    await addService(env.DB, profile.id, {
      name,
      description: String(form.get('description') ?? '').trim(),
      url: String(form.get('url') ?? '').trim(),
    });

    return { savedAt: Date.now(), message: 'Added' };
  }

  if (intent === 'remove-credibility' || intent === 'remove-service') {
    await removeRow(
      env.DB,
      intent === 'remove-credibility' ? 'profile_credibility' : 'profile_services',
      profile.id,
      String(form.get('entryId')),
    );

    return { savedAt: Date.now(), message: 'Removed' };
  }

  if (intent === 'restore') {
    const { error } = await restoreVersion(
      env.DB,
      workspace.id,
      String(form.get('versionId')),
      userId,
    );
    if (error) return data({ error }, { status: 400 });

    return { savedAt: Date.now(), message: 'Earlier version restored' };
  }

  if (intent === 'schedule') {
    const changes = JSON.parse(String(form.get('changes') ?? '{}')) as Partial<
      Record<ProfileField, string>
    >;
    const errors = validateProfile(changes);
    if (Object.keys(errors).length) return data({ errors }, { status: 400 });

    await scheduleChange(env.DB, profile, {
      changes,
      applyAt: String(form.get('applyAt')),
      conflictStrategy:
        form.get('conflictStrategy') === 'skip_edited' ? 'skip_edited' : 'overwrite',
      userId,
    });

    return { savedAt: Date.now(), message: 'Change scheduled' };
  }

  if (intent === 'cancel-schedule') {
    await cancelScheduledChange(env.DB, profile.id, String(form.get('scheduleId')));

    return { savedAt: Date.now(), message: 'Scheduled change cancelled' };
  }

  // Default: save the pending edits as one change.
  const changes: Partial<Record<ProfileField, string>> = {};

  for (const [key, value] of form.entries()) {
    if (key === 'intent' || typeof value !== 'string') continue;
    if (isTextField(key) || key in PROFILE_CHOICES) changes[key as ProfileField] = value.trim();
  }

  if (!Object.keys(changes).length) return data({ errors: {} }, { status: 400 });

  const errors = validateProfile(changes);
  if (Object.keys(errors).length) return data({ errors }, { status: 400 });

  await updateProfile(env.DB, workspace.id, changes, { userId });

  return { savedAt: Date.now(), message: 'Profile saved' };
}

type Draft = Partial<Record<ProfileField, string>>;

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { workspace, bundle, assets } = loaderData;
  const fetcher = useFetcher<{
    savedAt?: number;
    message?: string;
    errors?: Draft;
    error?: string;
  }>();
  const [draft, setDraft] = useState<Draft>({});
  const [preview, setPreview] = useState<Draft>({});
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const announced = useRef<number | null>(null);

  const pending = fetcher.state !== 'idle';
  const errors = fetcher.data?.errors ?? {};
  const savedAt = fetcher.data?.savedAt;

  const profile = bundle?.profile;
  const stored = (field: ProfileField) =>
    profile ? ((profile as Record<string, string>)[field] ?? '') : '';
  const value = (field: ProfileField) => draft[field] ?? stored(field);
  const shown = (field: ProfileField) => preview[field] ?? value(field);

  const dirtyFields = useMemo(
    () => (Object.keys(draft) as ProfileField[]).filter((field) => draft[field] !== stored(field)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, profile],
  );

  const blocker = useBlocker(dirtyFields.length > 0 && !pending);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave without saving?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!savedAt || announced.current === savedAt) return;
    announced.current = savedAt;

    setDraft({});
    setPreview({});
    toast.success(fetcher.data?.message ?? 'Profile saved');
  }, [savedAt, fetcher.data]);

  useEffect(() => {
    if (fetcher.data?.error) toast.error(fetcher.data.error);
  }, [fetcher.data]);

  if (!bundle || !profile) return null;

  const change = (field: ProfileField) => (next: string) =>
    setDraft((prev) => ({ ...prev, [field]: next }));
  const previewChange = (field: ProfileField) => (next: string) =>
    setPreview((prev) => ({ ...prev, [field]: next }));

  function save() {
    const payload = Object.fromEntries(dirtyFields.map((field) => [field, value(field)]));
    fetcher.submit({ ...payload, intent: 'save' }, { method: 'post' });
  }

  const textRow = (
    field: Exclude<ProfileField, keyof typeof PROFILE_CHOICES>,
    label: string,
    options: { kind?: 'text' | 'textarea'; placeholder?: string; hint?: string } = {},
  ) => (
    <EditableRow
      dirty={dirtyFields.includes(field)}
      error={errors[field]}
      hint={options.hint}
      key={field}
      kind={options.kind}
      label={label}
      maxLength={PROFILE_LIMITS[field]}
      name={field}
      onChange={change(field)}
      onPreview={previewChange(field)}
      placeholder={options.placeholder}
      value={value(field)}
    />
  );

  /** Which contact channel a 'preferred contact' choice refers to. */
  const PREFERRED_TO_CHANNEL: Record<string, ContactChannel | undefined> = {
    email: 'publicEmail',
    phone: 'phone',
    whatsapp: 'whatsapp',
    booking: 'bookingUrl',
  };

  const preferredChannel = PREFERRED_TO_CHANNEL[value('preferredContact')];
  const preferredHidden = Boolean(
    preferredChannel &&
    value(preferredChannel) &&
    bundle.contactVisibility[preferredChannel] !== 'public',
  );

  const contactRow = (channel: ContactChannel, label: string, placeholder: string) => (
    <EditableRow
      dirty={dirtyFields.includes(channel)}
      error={errors[channel]}
      key={channel}
      label={label}
      maxLength={PROFILE_LIMITS[channel]}
      name={channel}
      onChange={change(channel)}
      placeholder={placeholder}
      trailing={
        value(channel) ? (
          <ChannelVisibility
            channel={channel}
            isPublic={bundle.contactVisibility[channel] === 'public'}
          />
        ) : null
      }
      value={value(channel)}
    />
  );

  const byKind = (kind: CredibilityKind) =>
    bundle.credibility.filter((entry) => entry.kind === kind);

  return (
    <>
      <PageHeader
        action={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to={`/app/${workspace.slug}/profile/configuration`}>Configuration</Link>
            </Button>
            <ProfileHistory scheduled={bundle.scheduled} versions={bundle.versions} />
          </>
        }
        // badge={
        //   <span
        //     className={
        //       value('visibility') === 'public'
        //         ? 'rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11.5px] font-medium text-destructive'
        //         : 'rounded-full border border-border bg-muted px-2 py-0.5 text-[11.5px] text-muted-foreground'
        //     }
        //   >
        //     {value('visibility') === 'public' ? 'Public' : 'Private'}
        //   </span>
        // }
        description="The canonical version of this identity. Everything published elsewhere copies from here."
        title="Profile"
      />

      <div className="flex items-start gap-4 rounded-lg border border-border/70 bg-card p-4 sm:p-5">
        <ImagePicker assetId={profile.avatarKey} assets={assets} field="avatar" label="Profile photo" />
        <IdentityCard
          bio={shown('longBio') || shown('mediumBio')}
          embedded
          name={shown('displayName')}
          profession={shown('profession')}
          pronouns={shown('pronouns')}
          slug={workspace.slug}
          tagline={shown('shortBio')}
          visibility={value('visibility')}
        />
      </div>

      <Group title="Core identity">
        {textRow('displayName', 'Display name', { placeholder: 'Evans Kwofie' })}
        {textRow('handle', 'Handle', {
          placeholder: 'evanskwofie',
          hint: 'The username you prefer across platforms.',
        })}
        {textRow('pronunciation', 'Pronunciation', { placeholder: 'EV-anz KWOH-fee' })}
        {textRow('pronouns', 'Pronouns', { placeholder: 'they/them' })}
        {textRow('profession', 'Profession', { placeholder: 'Design engineer and founder' })}
        <ChoiceRow
          dirty={dirtyFields.includes('creatorType')}
          label="Identity type"
          onChange={change('creatorType')}
          options={PROFILE_CHOICES.creatorType}
          value={value('creatorType')}
        />
      </Group>

      <Group note="Three lengths, because platforms cap them differently." title="About">
        {textRow('shortBio', 'Tagline', { kind: 'textarea', hint: BIO_GUIDANCE.shortBio })}
        {textRow('mediumBio', 'Summary', { kind: 'textarea', hint: BIO_GUIDANCE.mediumBio })}
        {textRow('longBio', 'Full bio', { kind: 'textarea', hint: BIO_GUIDANCE.longBio })}
        {textRow('categories', 'Categories', {
          placeholder: 'Design, Software, Startups',
          hint: 'Comma separated.',
        })}
        {textRow('skills', 'Skills', { placeholder: 'Product design, React, Brand identity' })}
        {textRow('languages', 'Languages', { placeholder: 'English, Twi' })}
      </Group>

      <Group
        note={
          <>
            These appear under <span className="text-foreground">Get in touch</span> on your public
            profile. Each one stays hidden until you publish it.
          </>
        }
        title="Contact"
      >
        {contactRow('publicEmail', 'Email', 'hello@example.com')}
        {contactRow('phone', 'Phone', '+233 20 000 0000')}
        {contactRow('whatsapp', 'WhatsApp', '+233 20 000 0000')}
        {contactRow('bookingUrl', 'Booking link', 'https://cal.com/you')}
        <ChoiceRow
          dirty={dirtyFields.includes('preferredContact')}
          hint={
            preferredHidden
              ? 'This channel is hidden, so nobody can use it. Publish it, or choose another.'
              : 'How people are asked to reach you first.'
          }
          label="Preferred"
          onChange={change('preferredContact')}
          options={PROFILE_CHOICES.preferredContact}
          value={value('preferredContact')}
        />
      </Group>

      <Group title="Location">
        {textRow('city', 'City', { placeholder: 'Accra' })}
        {textRow('country', 'Country', { placeholder: 'Ghana' })}
        {textRow('serviceArea', 'Service area', { placeholder: 'West Africa and remote' })}
        {textRow('timezone', 'Time zone', { placeholder: 'GMT' })}
        <ChoiceRow
          dirty={dirtyFields.includes('remoteAvailability')}
          label="Working style"
          onChange={change('remoteAvailability')}
          options={PROFILE_CHOICES.remoteAvailability}
          value={value('remoteAvailability')}
        />
      </Group>

      <Group note="Links that back up who you say you are." title="Credibility">
        <div className="space-y-4 px-5 py-4">
          {(
            [
              [
                'verification',
                'Verification links',
                'A profile that proves this identity is yours',
              ],
              ['credential', 'Credentials', 'A qualification, certification or award'],
              ['affiliation', 'Affiliations', 'An organisation you belong to'],
              ['press', 'Press', 'Coverage worth pointing at'],
            ] as const
          ).map(([kind, label, empty]) => (
            <div className="space-y-2" key={kind}>
              <h4 className="text-[12.5px] font-medium text-foreground/80">{label}</h4>
              <EntryList
                addIntent="add-credibility"
                addLabel={`Add ${label.toLowerCase().replace(/s$/, '')}`}
                emptyText={`${empty}.`}
                entries={byKind(kind).map((entry) => ({
                  id: entry.id,
                  primary: entry.label,
                  secondary: entry.issuer,
                  href: entry.url,
                }))}
                fields={[
                  { name: 'label', placeholder: 'Name', required: true },
                  { name: 'issuer', placeholder: 'Issuer or publication' },
                  { name: 'url', placeholder: 'https://' },
                ]}
                hidden={{ kind }}
                removeIntent="remove-credibility"
              />
            </div>
          ))}
        </div>
      </Group>

      <Group title="Services">
        <div className="space-y-3 px-5 py-4">
          <EntryList
            addIntent="add-service"
            addLabel="Add a service"
            emptyText="Nothing listed yet."
            entries={bundle.services.map((entry) => ({
              id: entry.id,
              primary: entry.name,
              secondary: entry.description,
              href: entry.url,
            }))}
            fields={[
              { name: 'name', placeholder: 'Service or role', required: true },
              {
                name: 'description',
                placeholder: 'What it covers, who it is for, how you work on it',
                kind: 'textarea',
              },
              { name: 'url', placeholder: 'Link to a case study or booking page (optional)' },
            ]}
            removeIntent="remove-service"
          />
        </div>
        <ChoiceRow
          dirty={dirtyFields.includes('availabilityStatus')}
          hint="Shown on your public profile when it is not private."
          label="Availability"
          onChange={change('availabilityStatus')}
          options={PROFILE_CHOICES.availabilityStatus}
          value={value('availabilityStatus')}
        />
      </Group>

      <Group title="Profile controls">
        <VisibilityControl
          dirty={dirtyFields.includes('visibility')}
          onRequestChange={() => setVisibilityDialogOpen(true)}
          value={value('visibility')}
        />
      </Group>

      <ProfileVisibilityDialog
        currentVisibility={value('visibility')}
        onConfirm={change('visibility')}
        onOpenChange={setVisibilityDialogOpen}
        open={visibilityDialogOpen}
      />

      <SaveBar
        changes={Object.fromEntries(dirtyFields.map((field) => [field, value(field)]))}
        count={dirtyFields.length}
        onDiscard={() => {
          setDraft({});
          setPreview({});
        }}
        onSave={save}
        pending={pending}
      />
    </>
  );
}

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground/70">
          {title}
        </h2>
        {note ? <p className="text-[12px] text-muted-foreground">{note}</p> : null}
      </div>
      <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-card">
        {children}
      </div>
    </section>
  );
}
