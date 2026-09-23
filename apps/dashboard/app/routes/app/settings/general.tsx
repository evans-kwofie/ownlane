import { useEffect, useState } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { data, Link, useFetcher } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';

import { DeleteBrandDialog } from '../../../components/delete-brand-dialog';
import { cloudflare } from '../../../lib/cloudflare';
import { useActionFeedback } from '../../../lib/action-feedback';
import { toSlug, useActiveWorkspace } from '../../../lib/workspaces';
import { getWorkspaceForUser, renameWorkspace } from '../../../lib/workspaces.server';
import type { Route } from './+types/general';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Workspace settings — Ownlane' }];
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });

  const form = await args.request.formData();
  const result = await renameWorkspace(env.DB, workspace.id, {
    name: String(form.get('name') ?? ''),
    slug: String(form.get('slug') ?? ''),
  });

  if (!result.ok) return data({ error: result.error, field: result.field }, { status: 400 });

  // The slug is in the URL, so a change has to move the browser with it. The old
  // address keeps working; this just stops the page sitting on a stale one.
  return {
    saved: 'Workspace updated',
    redirectTo: result.slug === workspace.slug ? null : `/app/${result.slug}/settings`,
  };
}

export default function GeneralSettings() {
  const { workspace } = useActiveWorkspace();
  const fetcher = useFetcher<{ saved?: string; error?: string; redirectTo?: string | null }>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(workspace?.name ?? '');
  const [slug, setSlug] = useState(workspace?.slug ?? '');
  // Once someone edits the address by hand, it stops following the name.
  const [slugEdited, setSlugEdited] = useState(false);

  useActionFeedback(fetcher.data, { toastErrors: false });

  useEffect(() => {
    if (fetcher.data?.redirectTo) window.location.assign(fetcher.data.redirectTo);
  }, [fetcher.data]);

  if (!workspace) return null;

  const preview = toSlug(slugEdited ? slug : name);
  const changed = name !== workspace.name || preview !== workspace.slug;
  const saving = fetcher.state !== 'idle';

  return (
    <>
      <fetcher.Form className="max-w-[560px] space-y-5" method="post">
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">Name</Label>
          <Input
            id="ws-name"
            maxLength={60}
            name="name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <p className="text-xs text-muted-foreground">
            What this identity is called inside Ownlane. It is not your public display name.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ws-slug">Address</Label>
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 font-mono text-[12.5px] text-muted-foreground">/app/</span>
            <Input
              id="ws-slug"
              maxLength={48}
              name="slug"
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
              value={slugEdited ? slug : preview}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Appears in every link to this workspace. Changing it keeps the old address working —
            anything already shared or bookmarked still resolves here.
          </p>
        </div>

        {fetcher.data?.error ? (
          <p
            className="rounded-lg border px-3.5 py-2.5 text-[13px]"
            role="alert"
            style={{
              borderColor: 'color-mix(in srgb, var(--chart-down) 40%, transparent)',
              background: 'color-mix(in srgb, var(--chart-down) 8%, var(--card))',
            }}
          >
            {fetcher.data.error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button disabled={!changed || saving} type="submit">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <span className="text-[13px] capitalize text-muted-foreground">
            {workspace.kind === 'personal' ? 'Personal workspace' : 'Brand'}
          </span>
        </div>
      </fetcher.Form>

      {workspace.kind === 'brand' ? (
        <section className="mt-10 max-w-[560px]">
          <h2 className="text-[15px] font-medium tracking-[-0.01em]">Delete this brand</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-card px-5 py-4">
            <p className="min-w-0 max-w-prose text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              Removes {workspace.name} along with its profile, links, connected accounts and sync
              history. This cannot be undone.
            </p>
            <Button
              className="h-8 shrink-0 text-[13px]"
              onClick={() => setDeleteOpen(true)}
              type="button"
              variant="destructive"
            >
              Delete brand
            </Button>
          </div>
          <DeleteBrandDialog onOpenChange={setDeleteOpen} open={deleteOpen} workspace={workspace} />
        </section>
      ) : (
        <p className="mt-10 text-[13px] text-muted-foreground">
          This is your personal workspace, so it cannot be deleted. Brands you add can be.
        </p>
      )}

      {/* The split between this page and /app/account is not obvious from the
          rail, so it is stated where someone looking for the wrong one lands. */}
      <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
        Looking for your email, password or sign-out?{' '}
        <Link className="text-foreground underline underline-offset-4" to="/app/account">
          Your account
        </Link>{' '}
        holds everything that belongs to you rather than to this workspace.
      </p>
    </>
  );
}
