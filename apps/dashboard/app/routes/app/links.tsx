import { useEffect, useState } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';
import { toast } from '@ownlane/ui/components/sonner';
import { data, Link, useFetcher } from 'react-router';

import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import {
  createProfileLink,
  deleteProfileLink,
  moveProfileLink,
  updateProfileLink,
} from '../../features/links/actions.server';
import { listProfileLinks } from '../../features/links/queries.server';
import { listLinkCollections } from '../../features/links/queries.server';
import { linkSchema, type ProfileLink } from '../../features/links/schema';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/links';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Links — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  const [links, collections] = await Promise.all([
    listProfileLinks(env.DB, profile.id),
    listLinkCollections(env.DB, profile.id),
  ]);
  return { links, collections };
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });

  const form = await args.request.formData();
  const intent = String(form.get('intent'));
  const linkId = String(form.get('linkId') ?? '');
  if (intent === 'create' || intent === 'update') {
    const parsed = linkSchema.safeParse({ label: form.get('label'), url: form.get('url') });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return data(
        { fieldErrors: { label: errors.label?.[0], url: errors.url?.[0] } },
        { status: 400 },
      );
    }
    if (intent === 'create') await createProfileLink(env.DB, profile.id, parsed.data);
    else if (!linkId || !(await updateProfileLink(env.DB, profile.id, linkId, parsed.data)))
      return data({ error: 'That link no longer exists.' }, { status: 404 });
    return { saved: intent === 'create' ? 'Link added' : 'Link updated' };
  }
  if (intent === 'delete') {
    if (!linkId || !(await deleteProfileLink(env.DB, profile.id, linkId)))
      return data({ error: 'That link no longer exists.' }, { status: 404 });
    return { saved: 'Link deleted' };
  }
  if (intent === 'move') {
    const direction = String(form.get('direction'));
    if (
      (direction !== 'up' && direction !== 'down') ||
      !linkId ||
      !(await moveProfileLink(env.DB, profile.id, linkId, direction))
    )
      return data({ error: 'That link cannot be moved.' }, { status: 400 });
    return { saved: 'Link order updated' };
  }
  return data({ error: 'Unknown link action.' }, { status: 400 });
}

type MutationResult = { saved?: string; error?: string };

export default function Links({ loaderData }: Route.ComponentProps) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<ProfileLink>();
  const mutation = useFetcher<MutationResult>();

  useEffect(() => {
    if (mutation.data?.saved) toast.success(mutation.data.saved);
    if (mutation.data?.error) toast.error(mutation.data.error);
  }, [mutation.data]);

  useEffect(() => {
    if (mutation.data?.saved === 'Link deleted') setDeleting(undefined);
  }, [mutation.data]);

  return (
    <>
      <PageHeader
        action={
          <div className="flex items-center gap-2">
            <Button asChild className="h-9 text-[13px]" variant="outline">
              <Link to="collections/new">Create collection</Link>
            </Button>
            <Button
              className="h-9 gap-1.5 bg-foreground text-[13px] text-background hover:bg-foreground/90"
              onClick={() => setAdding(true)}
            >
              Add link
            </Button>
          </div>
        }
        title="Links"
        description="Organize the destinations on your profile into intentional collections."
      />
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loaderData.collections.map((collection) => (
          <Link
            className="rounded-xl border border-border/70 bg-card p-5 transition-colors hover:bg-accent/40"
            key={collection.id}
            to={`collections/${collection.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{collection.title}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {collection.isActive ? 'Visible' : 'Hidden'}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {collection.linkCount} {collection.linkCount === 1 ? 'link' : 'links'}
            </p>
          </Link>
        ))}
      </section>
      {loaderData.collections.length ? (
        <p className="mb-3 text-[13px] font-medium text-muted-foreground">All links</p>
      ) : null}
      {loaderData.links.length ? (
        <ol className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
          {loaderData.links.map((link, index) => (
            <li className="flex items-center gap-3 px-4 py-3 sm:px-5" key={link.id}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{link.label}</p>
                  <LinkStatus link={link} />
                </div>
                <a
                  className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                  href={link.url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {link.url}
                </a>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <MoveButton
                  disabled={index === 0}
                  direction="up"
                  linkId={link.id}
                  mutation={mutation}
                />
                <MoveButton
                  disabled={index === loaderData.links.length - 1}
                  direction="down"
                  linkId={link.id}
                  mutation={mutation}
                />
                <Button asChild size="sm" variant="ghost">
                  <Link to={link.id}>Edit</Link>
                </Button>
                <Button onClick={() => setDeleting(link)} size="sm" type="button" variant="ghost">
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          action={
            <Button
              className="h-9 gap-1.5 bg-foreground text-[13px] text-background hover:bg-foreground/90"
              onClick={() => setAdding(true)}
            >
              Add your first link
            </Button>
          }
          title="No links yet"
          description="Add the places you want people to find first."
        />
      )}
      <DeleteLinkDialog
        link={deleting}
        mutation={mutation}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      />
      <AddLinkDialog onOpenChange={setAdding} open={adding} />
    </>
  );
}

function AddLinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetcher = useFetcher<MutationResult>();
  const pending = fetcher.state !== 'idle';
  useEffect(() => {
    if (fetcher.data?.saved) {
      toast.success(fetcher.data.saved);
      onOpenChange(false);
    }
  }, [fetcher.data, onOpenChange]);
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add link</DialogTitle>
          <DialogDescription>
            Add a destination to your links page. You can refine it later in the editor.
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="create" />
          <div className="space-y-2">
            <Label htmlFor="quick-link-label">Label</Label>
            <Input id="quick-link-label" name="label" placeholder="Portfolio" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-link-url">URL</Label>
            <Input
              id="quick-link-url"
              name="url"
              placeholder="https://example.com"
              required
              type="url"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-link-status">Publishing</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue="live"
              id="quick-link-status"
              name="publicationStatus"
            >
              <option value="live">Live now</option>
              <option value="draft">Save as draft</option>
            </select>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? 'Adding…' : 'Add link'}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}

function LinkStatus({ link }: { link: ProfileLink }) {
  const ended =
    link.publicationStatus === 'scheduled' && link.endsAt && new Date(link.endsAt) <= new Date();
  const upcoming =
    link.publicationStatus === 'scheduled' &&
    (!link.startsAt || new Date(link.startsAt) > new Date());
  const label = ended
    ? 'Ended'
    : upcoming
      ? 'Scheduled'
      : link.publicationStatus === 'live'
        ? 'Live'
        : link.publicationStatus === 'paused'
          ? 'Paused'
          : 'Draft';
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function MoveButton({
  direction,
  linkId,
  disabled,
  mutation,
}: {
  direction: 'up' | 'down';
  linkId: string;
  disabled: boolean;
  mutation: ReturnType<typeof useFetcher<MutationResult>>;
}) {
  return (
    <mutation.Form method="post">
      <input name="intent" type="hidden" value="move" />
      <input name="linkId" type="hidden" value={linkId} />
      <input name="direction" type="hidden" value={direction} />
      <Button
        aria-label={`Move ${direction}`}
        disabled={disabled || mutation.state !== 'idle'}
        size="sm"
        type="submit"
        variant="ghost"
      >
        {direction === 'up' ? '↑' : '↓'}
      </Button>
    </mutation.Form>
  );
}

function DeleteLinkDialog({
  link,
  mutation,
  onOpenChange,
}: {
  link?: ProfileLink;
  mutation: ReturnType<typeof useFetcher<MutationResult>>;
  onOpenChange: (open: boolean) => void;
}) {
  const pending = mutation.state !== 'idle';
  return (
    <Dialog onOpenChange={onOpenChange} open={!!link}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete {link?.label}?</DialogTitle>
          <DialogDescription>
            This removes this destination from your public profile. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <mutation.Form method="post">
            <input name="intent" type="hidden" value="delete" />
            <input name="linkId" type="hidden" value={link?.id ?? ''} />
            <Button disabled={pending} type="submit" variant="destructive">
              {pending ? 'Deleting…' : 'Delete link'}
            </Button>
          </mutation.Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
