import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/connections';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Connections — Ownlane' }];
}

export default function Connections() {
  return (
    <>
      <PageHeader
        title="Connections"
        description="The platforms Ownlane keeps current on your behalf."
      />
      <EmptyState
        title="Nothing connected"
        description="Connect a platform and your profile changes will flow to it automatically."
      />
    </>
  );
}
