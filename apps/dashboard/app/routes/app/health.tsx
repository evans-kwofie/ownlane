import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/health';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Identity health — Ownlane' }];
}

export default function Health() {
  return (
    <>
      <PageHeader
        title="Identity health"
        description="Where your presence has drifted, gone stale or broken."
      />
      <EmptyState
        title="Nothing to check yet"
        description="Add a profile and connect a platform, and Ownlane will audit them for missing, outdated and conflicting details."
      />
    </>
  );
}
