import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/analytics';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Analytics — Ownlane' }];
}

export default function Analytics() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Who is finding you, from where, and what they do next."
      />
      <EmptyState
        title="No data yet"
        description="Publish your public site to start measuring visits, clicks and the paths people take."
      />
    </>
  );
}
