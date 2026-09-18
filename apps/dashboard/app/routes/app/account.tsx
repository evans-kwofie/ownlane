import { useState } from 'react';
import { useClerk, useUser } from '@clerk/react-router';
import { Add01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import { toCapitalised } from '@ownlane/ui/lib/text';
import { Link } from 'react-router';

import { AddBrandDialog } from '../../components/add-brand-dialog';
import { PageHeader } from '../../components/page-header';
import { useWorkspacePath, useWorkspaces } from '../../lib/workspaces';
import type { Route } from './+types/account';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Account — Ownlane' }];
}

/**
 * Belongs to the person, not to any one brand: sign-in details, the session,
 * and the list of identities this account can act as. Deliberately outside the
 * `/app/:workspace` segment.
 */
export default function Account() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const workspaces = useWorkspaces();
  const workspacePath = useWorkspacePath();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        to={workspacePath()}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={1.5} />
        Back to workspace
      </Link>

      <div className="mt-6">
        <PageHeader
          description="How you sign in, and the identities you manage."
          title="Your account"
        />
      </div>

      <Section title="Sign in" description="These details belong to you, not to any brand.">
        <dl className="divide-y divide-border/70">
          <Row label="Email" value={user?.primaryEmailAddress?.emailAddress ?? '—'} />
          <Row label="Name" value={user?.fullName ? toCapitalised(user.fullName) : '—'} />
          <Row
            label="Joined"
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
          />
          <div className="flex items-center justify-between gap-6 px-5 py-3.5">
            <span className="text-[13px] text-muted-foreground">Session</span>
            <Button
              className="h-8 text-[13px]"
              onClick={() => void signOut({ redirectUrl: '/' })}
              type="button"
              variant="outline"
            >
              Sign out
            </Button>
          </div>
        </dl>
      </Section>

      <Section
        className="mt-8"
        title="Brands"
        description="Each brand keeps its own profile, public site, links and connections, at its own address."
        action={
          <Button
            className="h-8 gap-1.5 text-[13px]"
            onClick={() => setAddOpen(true)}
            type="button"
            variant="outline"
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
            Add a brand
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {workspaces.map((workspace) => (
            <li className="flex items-center justify-between gap-4 px-5 py-3.5" key={workspace.id}>
              <Link className="flex min-w-0 items-center gap-2.5" to={`/app/${workspace.slug}`}>
                <span className="grid size-6 shrink-0 place-items-center rounded bg-foreground text-[10px] font-semibold text-background">
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px]">
                    {toCapitalised(workspace.name)}
                  </span>
                  <span className="block truncate font-mono text-[11.5px] text-muted-foreground">
                    /app/{workspace.slug}
                  </span>
                </span>
              </Link>
              <span className="shrink-0 text-[12.5px] text-muted-foreground">
                {workspace.kind === 'personal' ? 'Personal' : 'Brand'}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <AddBrandDialog onOpenChange={setAddOpen} open={addOpen} />
    </main>
  );
}

function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-[13.5px]">{value}</dd>
    </div>
  );
}
