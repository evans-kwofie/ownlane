import { useClerk, useUser } from '@clerk/react-router';
import { Menu01Icon, Search01Icon, UnfoldMoreIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ownlane/ui/components/dropdown-menu';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';
import { toCapitalised } from '@ownlane/ui/lib/text';
import { cn } from '@ownlane/ui/lib/utils';
import { Link, useLocation } from 'react-router';

import { CommandPalette, useCommandPalette } from './command-palette';
import { useActiveWorkspace, usePublicSiteOrigin, useWorkspacePath } from '../lib/workspaces';

/** Stable names for the breadcrumb, independent of what a page calls itself. */
const PAGE_NAMES: Record<string, string> = {
  activity: 'Activity',
  analytics: 'Analytics',
  assets: 'Assets',
  audience: 'Audience',
  connections: 'Connections',
  content: 'Content',
  developer: 'Developer',
  health: 'Identity health',
  links: 'Links',
  profile: 'Profile',
  settings: 'Settings',
  configuration: 'Configuration',
};

/**
 * The app's own strip: the mark, where you are, and the controls that never
 * belong to a page. It runs the full width above everything, including the
 * rail, so the dashboard reads as one surface.
 */
export function DashboardHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { workspace } = useActiveWorkspace();
  const workspacePath = useWorkspacePath();
  const { pathname } = useLocation();
  const publicSiteOrigin = usePublicSiteOrigin();
  const { open, setOpen } = useCommandPalette();

  if (!workspace) return null;

  const crumbs = breadcrumbSegments(pathname, workspace.slug);
  const publicSiteUrl = `${publicSiteOrigin}/${workspace.slug}`;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-stretch border-b border-border/70 bg-background">
      {/* The rail's width and its divider, carried up through the strip so the
          vertical line runs unbroken from the top of the window. */}
      <div className="flex items-center gap-2 px-4 lg:w-[248px] lg:shrink-0 lg:border-r lg:border-border/70 lg:px-5">
        <button
          aria-label="Open navigation"
          className="-ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
          onClick={onOpenNav}
          type="button"
        >
          <HugeiconsIcon icon={Menu01Icon} size={18} strokeWidth={1.5} />
        </button>

        <Link className="flex shrink-0 items-center gap-2" to={workspacePath()}>
          <OwnlaneMark className="size-[18px] text-ownlane-orange" variant="open" />
          <span className="text-[13px] font-semibold tracking-[-0.02em]">OWNLANE</span>
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]"
        >
          {crumbs.length ? (
            <>
              <Link
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                to={workspacePath()}
              >
                Overview
              </Link>
              <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">
                |
              </span>
              {crumbs.map((crumb, index) => (
                <span className="contents" key={`${crumb.label}-${index}`}>
                  {index < crumbs.length - 1 ? (
                    <>
                      <Link
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        to={workspacePath(crumb.to)}
                      >
                        {crumb.label}
                      </Link>
                      <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">
                        |
                      </span>
                    </>
                  ) : (
                    <span aria-current="page" className="truncate font-medium">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </>
          ) : (
            <span aria-current="page" className="truncate font-medium">
              Overview
            </span>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className="hidden items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:flex"
            onClick={() => setOpen(true)}
            type="button"
          >
            <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.5} />
            <span className="pr-8">Search</span>
            <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          <Button asChild className="h-8 px-2.5 text-[12.5px]" size="sm" variant="ghost">
            <a href={publicSiteUrl} rel="noreferrer" target="_blank">
              Public site <span aria-hidden="true">↗</span>
            </a>
          </Button>

          <AccountMenu />
        </div>
      </div>
      <CommandPalette onOpenChange={setOpen} open={open} />
    </header>
  );
}

function breadcrumbSegments(pathname: string, workspace: string) {
  const parts = pathname.split('/').filter(Boolean);
  const route = parts.slice(parts.indexOf(workspace) + 1);
  if (!route.length) return [];
  if (route[0] === 'profile' && route[1] === 'configuration')
    return [
      { label: 'Profile', to: '/profile' },
      { label: 'Configuration', to: '/profile/configuration' },
    ];
  if (route[0] === 'links') {
    if (route[1] === 'collections')
      return [
        { label: 'Links', to: '/links' },
        { label: 'Collections', to: '/links' },
        { label: route[2] === 'new' ? 'New collection' : 'Collection', to: pathname },
      ];
    return [
      { label: 'Links', to: '/links' },
      ...(route[1] ? [{ label: route[1] === 'new' ? 'Add link' : 'Edit link', to: pathname }] : []),
    ];
  }
  const label = PAGE_NAMES[route.at(-1) ?? ''] ?? 'Dashboard';
  return [{ label, to: pathname }];
}

/**
 * The avatar follows one rule: the account's photo if there genuinely is one,
 * then initials we draw ourselves. The identity provider returns a generated
 * initials image for accounts with no photo, which is why `hasImage` decides
 * rather than the URL merely being present.
 */
function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const name = user?.fullName || user?.firstName || email.split('@')[0] || 'Your account';
  const photo = user?.hasImage ? user.imageUrl : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-1.5 outline-none ring-ring/40 transition-colors hover:bg-accent/60 focus-visible:ring-2">
        <Avatar name={name} photo={photo} size={28} />
        <span className="hidden min-w-0 flex-col items-start leading-tight md:flex">
          <span className="max-w-[150px] truncate text-[12.5px] font-medium">
            {toCapitalised(name)}
          </span>
          {email ? (
            <span className="max-w-[150px] truncate text-[11px] text-muted-foreground">
              {email}
            </span>
          ) : null}
        </span>
        <HugeiconsIcon
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
          icon={UnfoldMoreIcon}
          size={13}
          strokeWidth={1.5}
        />
        <span className="sr-only">Open account menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[216px] text-[13px]" sideOffset={8}>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar name={name} photo={photo} size={30} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-tight">{toCapitalised(name)}</p>
            {email ? (
              <p className="truncate text-[12px] leading-tight text-muted-foreground">{email}</p>
            ) : null}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/account">Account settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut({ redirectUrl: '/' })} variant="destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Drawn in our own type and palette when there is no photograph to show. */
export function Avatar({
  name,
  photo,
  size = 26,
  square,
}: {
  name: string;
  photo?: string;
  size?: number;
  square?: boolean;
}) {
  const shape = square ? 'rounded-md' : 'rounded-full';

  if (photo) {
    return (
      <img
        alt=""
        className={cn('shrink-0 object-cover', shape)}
        height={size}
        src={photo}
        style={{ height: size, width: size }}
        width={size}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center bg-foreground font-medium text-background',
        shape,
      )}
      style={{ height: size, width: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials || '·'}
    </span>
  );
}
