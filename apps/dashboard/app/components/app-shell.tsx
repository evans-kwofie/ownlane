import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { cn } from '@ownlane/ui/lib/utils';
import {
  Activity01Icon,
  Analytics01Icon,
  Cancel01Icon,
  DashboardSquare01Icon,
  HeartCheckIcon,
  Image02Icon,
  Link01Icon,
  News01Icon,
  PlugSocketIcon,
  Settings01Icon,
  SourceCodeIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { WorkspaceSwitcher } from './workspace-switcher';
import { DashboardHeader } from './dashboard-header';
import { useWorkspacePath } from '../lib/workspaces';

/** `to` is relative to the active workspace: '' is its overview. */
type NavItem = { to: string; label: string; icon: IconSvgElement; end?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

/**
 * Grouped once past seven items — see docs/dashboard-navigation.md. Overview
 * and Settings stay outside the groups, at the top and bottom of the rail.
 */
const NAV: NavGroup[] = [
  { items: [{ to: '', label: 'Overview', icon: DashboardSquare01Icon, end: true }] },
  {
    label: 'Identity',
    items: [
      { to: '/profile', label: 'Profile', icon: UserCircleIcon },
      { to: '/assets', label: 'Assets', icon: Image02Icon },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { to: '/links', label: 'Links', icon: Link01Icon },
      { to: '/connections', label: 'Connections', icon: PlugSocketIcon },
      { to: '/content', label: 'Content', icon: News01Icon },
    ],
  },
  {
    label: 'Insight',
    items: [
      { to: '/activity', label: 'Activity', icon: Activity01Icon },
      { to: '/health', label: 'Identity health', icon: HeartCheckIcon },
      { to: '/analytics', label: 'Analytics', icon: Analytics01Icon },
      { to: '/audience', label: 'Audience', icon: UserGroupIcon },
    ],
  },
  {
    items: [
      { to: '/developer', label: 'Developer', icon: SourceCodeIcon },
      { to: '/settings', label: 'Settings', icon: Settings01Icon },
    ],
  },
];

/**
 * Chrome for every signed-in screen: a fixed rail on desktop, a slide-over on
 * small screens, and a single scrolling content column. Pages render into the
 * outlet and own nothing but their own content.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // A tapped nav item should close the slide-over, not leave it covering the page.
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      {/* One strip across the whole app, above the rail as well as the page. */}
      <DashboardHeader onOpenNav={() => setNavOpen(true)} />

      <div className="lg:flex">
        {navOpen ? (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => setNavOpen(false)}
            type="button"
          />
        ) : null}

        <Sidebar onClose={() => setNavOpen(false)} open={navOpen} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full flex-1 px-5 pb-16 pt-8 sm:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ onClose, open }: { onClose: () => void; open: boolean }) {
  const workspacePath = useWorkspacePath();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border/70 bg-background transition-transform duration-200 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center justify-end px-3 pt-3 lg:hidden">
        <button
          aria-label="Close navigation"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-3 pb-3 pt-3">
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-5">
        {NAV.map((group, index) => (
          <div className={cn(index > 0 && 'mt-5')} key={group.label ?? index}>
            {group.label ? (
              <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon, end }) => (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
                      isActive
                        ? 'bg-accent font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )
                  }
                  end={end}
                  key={to}
                  to={workspacePath(to)}
                >
                  <HugeiconsIcon className="shrink-0" icon={icon} size={18} strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
