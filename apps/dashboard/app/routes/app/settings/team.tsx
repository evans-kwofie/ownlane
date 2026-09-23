import { Link } from 'react-router';

import { EmptyState } from '../../../components/empty-state';
import { useActiveWorkspace } from '../../../lib/workspaces';
import type { Route } from './+types/team';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Team — Ownlane' }];
}

export default function TeamSettings() {
  const { workspace } = useActiveWorkspace();

  return (
    <>
      <EmptyState
        title="You are the only person here"
        description={`${workspace?.name ?? 'This workspace'} has one member. Inviting people, and choosing what each of them can reach, needs roles and invitations that are not built yet.`}
      />
      <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
        Membership belongs to a workspace, not to you — someone can help with one brand without
        seeing the others. Your own sign-in details and sessions live in{' '}
        <Link className="text-foreground underline underline-offset-4" to="/app/account">
          your account
        </Link>
        .
      </p>
    </>
  );
}
