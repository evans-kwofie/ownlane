import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/audience';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Audience — Ownlane' }];
}

export default function Audience() {
  return (
    <>
      <PageHeader
        title="Audience"
        description="The contacts and leads you own outright, independent of any platform."
      />
      <EmptyState
        title="No contacts yet"
        description="Capture enquiries from your public site and keep them here, with consent recorded."
      />
    </>
  );
}
