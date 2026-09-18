import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/activity';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Activity — Ownlane' }];
}

export default function Activity() {
  return (
    <>
      <PageHeader
        title="Activity"
        description="Every change Ownlane has made on your behalf, and what happened to it."
      />
      <EmptyState
        title="Nothing has run yet"
        description="Once platforms are connected, each sync shows here with its result, and can be retried or rolled back."
      />
    </>
  );
}
