import { useState } from 'react';
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  UnfoldMoreIcon,
  UserAccountIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { toCapitalised } from '@ownlane/ui/lib/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ownlane/ui/components/dropdown-menu';
import { Link, useLocation, useNavigate } from 'react-router';

import { AddBrandDialog } from './add-brand-dialog';
import { Avatar } from './dashboard-header';
import { useActiveWorkspace, useWorkspaces, type Workspace } from '../lib/workspaces';

/**
 * Context control, not navigation: which identity everything below the rail
 * refers to. Quiet for someone managing only themselves, and the way an agency
 * moves between clients.
 */
export function WorkspaceSwitcher() {
  const workspaces = useWorkspaces();
  const { workspace: current } = useActiveWorkspace();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);

  if (!current) return null;

  /** Swap the workspace segment and stay on the same section. */
  function switchTo(slug: string) {
    if (slug === current!.slug) return;

    const here = `/app/${current!.slug}`;
    navigate(pathname.startsWith(here) ? pathname.replace(here, `/app/${slug}`) : `/app/${slug}`);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <WorkspaceBadge workspace={current} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {toCapitalised(current.name)}
          </span>
          <HugeiconsIcon
            className="shrink-0 text-muted-foreground"
            icon={UnfoldMoreIcon}
            size={14}
            strokeWidth={1.5}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[216px] text-[13px]" sideOffset={6}>
          <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
            Identities
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => switchTo(workspace.slug)}>
              <WorkspaceBadge workspace={workspace} />
              <span className="min-w-0 flex-1 truncate">{toCapitalised(workspace.name)}</span>
              {workspace.id === current.id ? (
                <HugeiconsIcon
                  className="text-ownlane-orange"
                  icon={CheckmarkCircle02Icon}
                  size={15}
                  strokeWidth={1.5}
                />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              // Let the menu close first, then open the dialog over the page.
              event.preventDefault();
              setAddOpen(true);
            }}
          >
            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={1.5} />
            Add a brand
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/app/account">
              <HugeiconsIcon icon={UserAccountIcon} size={15} strokeWidth={1.5} />
              Your account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddBrandDialog onOpenChange={setAddOpen} open={addOpen} />
    </>
  );
}

function WorkspaceBadge({ workspace }: { workspace: Workspace }) {
  return (
    <Avatar
      name={workspace.name}
      photo={workspace.avatarAssetId ? `/assets/${workspace.avatarAssetId}` : undefined}
      size={18}
      square
    />
  );
}
