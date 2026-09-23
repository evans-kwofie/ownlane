import { NavLink, Outlet } from 'react-router';

import { cn } from '@ownlane/ui/lib/utils';

import { PageHeader } from '../../../components/page-header';
import { useWorkspacePath } from '../../../lib/workspaces';

/** Tabs that are real routes, so each section is linkable. Matches Settings. */
const TABS = [
  { to: '', label: 'API keys', end: true },
  { to: '/webhooks', label: 'Webhooks', end: false },
  { to: '/mcp', label: 'AI & MCP', end: false },
  { to: '/embeds', label: 'Embeds', end: false },
];

export default function DeveloperLayout() {
  const workspacePath = useWorkspacePath();

  return (
    <>
      <PageHeader
        title="Developer"
        description="Connect Ownlane to your own systems, your website, and the AI tools you use."
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
            to={workspacePath(`/developer${tab.to}`)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  );
}
