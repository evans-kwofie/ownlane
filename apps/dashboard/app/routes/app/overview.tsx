import { getAuth } from '@clerk/react-router/server';
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Link01Icon,
  PlugSocketIcon,
  RefreshIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { cn } from '@ownlane/ui/lib/utils';
import { Link, redirect } from 'react-router';

import { PageHeader } from '../../components/page-header';
import { cloudflare } from '../../lib/cloudflare';
import { getWorkspaceForUser, readOverview } from '../../lib/workspaces.server';
import { toCapitalised } from '@ownlane/ui/lib/text';

import { useWorkspacePath } from '../../lib/workspaces';
import type { Route } from './+types/overview';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Overview — Ownlane' }];
}

/** Everything here describes the workspace in the URL, not the person reading it. */
export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  return { workspace, overview: await readOverview(env.DB, workspace.id) };
}

export default function Overview({ loaderData }: Route.ComponentProps) {
  const { workspace, overview } = loaderData;
  const workspacePath = useWorkspacePath();

  const profileReady = Boolean(overview.profile?.hasBio && overview.profile?.hasAvatar);

  const steps = [
    {
      done: profileReady,
      title: 'Complete the profile',
      description: overview.profile?.hasAvatar
        ? 'Add a short bio so every platform has something to copy.'
        : overview.profile?.hasBio
          ? 'Add a photo or logo to finish the profile.'
          : 'Add a bio and a photo — the source everything else copies from.',
      to: workspacePath('/profile'),
    },
    {
      done: overview.links > 0,
      title: 'Add the first link',
      description: 'Point people at the places that matter most.',
      to: workspacePath('/links'),
    },
    {
      done: overview.connections > 0,
      title: 'Connect a platform',
      description: 'Ownlane updates connected platforms whenever this profile changes.',
      to: workspacePath('/connections'),
    },
  ];

  const remaining = steps.filter((step) => !step.done).length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${toCapitalised(workspace.name)}`}
        description={
          remaining
            ? `${remaining} ${remaining === 1 ? 'step' : 'steps'} left before Ownlane can keep this profile current everywhere it appears.`
            : 'Everything is set up. Ownlane will flag anything that drifts.'
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={UserCircleIcon}
          label="Profile"
          value={profileReady ? 'Complete' : 'Incomplete'}
        />
        <Stat icon={Link01Icon} label="Links" value={String(overview.links)} />
        <Stat icon={PlugSocketIcon} label="Connections" value={String(overview.connections)} />
        <Stat
          icon={RefreshIcon}
          label="Last sync"
          value={overview.lastSyncAt ? new Date(overview.lastSyncAt).toLocaleDateString() : 'Never'}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Get set up</h2>
        <ol className="mt-3 divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-card">
          {steps.map((step) => (
            <li key={step.title}>
              <Link
                className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/50"
                to={step.to}
              >
                <HugeiconsIcon
                  className={cn(
                    'shrink-0',
                    step.done ? 'text-ownlane-orange' : 'text-muted-foreground/50',
                  )}
                  icon={CheckmarkCircle02Icon}
                  size={18}
                  strokeWidth={1.5}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[13.5px] font-medium',
                      step.done && 'text-muted-foreground line-through decoration-border',
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </span>
                </span>
                <HugeiconsIcon
                  className="shrink-0 text-muted-foreground/60"
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={1.5}
                />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">Needs attention</h2>
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-border/70 bg-card px-4 py-4">
          <HugeiconsIcon
            className="mt-px shrink-0 text-muted-foreground/60"
            icon={AlertCircleIcon}
            size={18}
            strokeWidth={1.5}
          />
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Nothing to fix. Once platforms are connected, stale profiles, broken links and failed
            syncs show up here first.
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ icon, label, value }: { icon: IconSvgElement; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-4 py-3.5">
      <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <HugeiconsIcon icon={icon} size={15} strokeWidth={1.5} />
        {label}
      </span>
      <p className="mt-2 text-[19px] font-medium tracking-[-0.02em]">{value}</p>
    </div>
  );
}
