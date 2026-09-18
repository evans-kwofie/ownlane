import { useState } from 'react';
import { Button } from '@ownlane/ui/components/button';
import { toCapitalised } from '@ownlane/ui/lib/text';
import { Link } from 'react-router';

import { DeleteBrandDialog } from '../../components/delete-brand-dialog';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { useActiveWorkspace } from '../../lib/workspaces';
import type { Route } from './+types/settings';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Workspace settings — Ownlane' }];
}

/**
 * Settings for this identity only. Anything belonging to the person — sign-in
 * details, sessions, the list of brands — lives at /app/account instead.
 */
export default function Settings() {
  const { workspace } = useActiveWorkspace();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!workspace) return null;

  return (
    <>
      <PageHeader
        title="Workspace settings"
        description={`Name, address and preferences for ${workspace.name}.`}
      />

      <dl className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-card">
        <Row label="Name" value={toCapitalised(workspace.name)} />
        <Row label="Address" value={`/app/${workspace.slug}`} />
        <Row label="Type" value={workspace.kind === 'personal' ? 'Personal' : 'Brand'} />
      </dl>

      <div className="mt-8">
        <EmptyState
          title="Nothing to configure yet"
          description="Renaming, addresses, visibility and team permissions arrive with the workspace data layer."
        />
      </div>

      {workspace.kind === 'brand' ? (
        <section className="mt-10">
          <h2 className="text-[15px] font-medium tracking-[-0.01em]">Delete this brand</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-card px-5 py-4">
            <p className="max-w-prose min-w-0 text-[13px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
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

      <p className="mt-6 text-[13px] text-muted-foreground">
        Looking for your email, password or sign-out?{' '}
        <Link className="text-foreground underline underline-offset-4" to="/app/account">
          Your account
        </Link>{' '}
        holds everything that belongs to you rather than to this workspace.
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-[12.5px]" title={value}>
        {value}
      </dd>
    </div>
  );
}
