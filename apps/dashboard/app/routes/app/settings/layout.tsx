import { NavLink, Outlet } from 'react-router';

import { cn } from '@ownlane/ui/lib/utils';

import { PageHeader } from '../../../components/page-header';
import { useActiveWorkspace, useWorkspacePath } from '../../../lib/workspaces';

/**
 * Settings for this identity. Anything belonging to the person — sign-in
 * details, sessions, the list of brands — lives at /app/account instead.
 *
 * Each tab is a real route rather than client-side state, so a section can be
 * linked to, opened in a new tab, and reached with the browser's back button.
 * They read as tabs; they behave as pages.
 */
const TABS = [
  { to: '', label: 'General', end: true },
  { to: '/team', label: 'Team', end: false },
  { to: '/billing', label: 'Billing', end: false },
];

export default function SettingsLayout() {
  const { workspace } = useActiveWorkspace();
  const workspacePath = useWorkspacePath();

  if (!workspace) return null;

  return (
    <>
      <PageHeader
        title="Workspace settings"
        description={`Name, address and preferences for ${workspace.name}.`}
      />

      <nav className="mb-6 flex gap-0.5 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                'relative whitespace-nowrap px-3 py-2.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground',
                isActive &&
                  'font-medium text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary',
              )
            }
            end={tab.end}
            key={tab.label}
            to={workspacePath(`/settings${tab.to}`)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  );
}
