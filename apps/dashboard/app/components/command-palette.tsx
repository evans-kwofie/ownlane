import { useEffect, useState } from 'react';
import {
  Analytics01Icon,
  DashboardSquare01Icon,
  Globe02Icon,
  HeartCheckIcon,
  Image02Icon,
  Link01Icon,
  News01Icon,
  PlugSocketIcon,
  Settings01Icon,
  SourceCodeIcon,
  UserAccountIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ownlane/ui/components/command';
import { toCapitalised } from '@ownlane/ui/lib/text';
import { useNavigate } from 'react-router';

import { Avatar } from './dashboard-header';
import { useActiveWorkspace, useWorkspacePath, useWorkspaces } from '../lib/workspaces';

const DESTINATIONS: { to: string; label: string; icon: IconSvgElement }[] = [
  { to: '', label: 'Overview', icon: DashboardSquare01Icon },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon },
  { to: '/profile/configuration', label: 'Profile configuration', icon: Globe02Icon },
  { to: '/assets', label: 'Assets', icon: Image02Icon },
  { to: '/links', label: 'Links', icon: Link01Icon },
  { to: '/connections', label: 'Connections', icon: PlugSocketIcon },
  { to: '/content', label: 'Content', icon: News01Icon },
  { to: '/health', label: 'Identity health', icon: HeartCheckIcon },
  { to: '/audience', label: 'Audience', icon: UserGroupIcon },
  { to: '/analytics', label: 'Analytics', icon: Analytics01Icon },
  { to: '/developer', label: 'Developer', icon: SourceCodeIcon },
  { to: '/settings', label: 'Workspace settings', icon: Settings01Icon },
];

/**
 * Everywhere you can go, from the keyboard. It navigates rather than searching
 * content — there is no content index yet, and a box that pretends to search
 * would be worse than one that moves you somewhere.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const workspacePath = useWorkspacePath();
  const workspaces = useWorkspaces();
  const { workspace: current } = useActiveWorkspace();

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandInput placeholder="Go to a page, or switch identity…" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        <CommandGroup heading="Go to">
          {DESTINATIONS.map((destination) => (
            <CommandItem
              key={destination.to || 'overview'}
              onSelect={() => go(workspacePath(destination.to))}
              value={destination.label}
            >
              <HugeiconsIcon icon={destination.icon} size={16} strokeWidth={1.5} />
              {destination.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {workspaces.length > 1 ? (
          <CommandGroup heading="Identities">
            {workspaces.map((workspace) => (
              <CommandItem
                key={workspace.id}
                onSelect={() => go(`/app/${workspace.slug}`)}
                value={`${workspace.name} ${workspace.slug}`}
              >
                <Avatar
                  name={workspace.name}
                  photo={workspace.avatarAssetId ? `/assets/${workspace.avatarAssetId}` : undefined}
                  size={16}
                  square
                />
                {toCapitalised(workspace.name)}
                {workspace.id === current?.id ? (
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    current
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go('/app/account')} value="Account settings">
            <HugeiconsIcon icon={UserAccountIcon} size={16} strokeWidth={1.5} />
            Account settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** ⌘K anywhere in the dashboard. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;

      event.preventDefault();
      setOpen((previous) => !previous);
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen };
}
