import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/content';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Content — Ownlane' }];
}

export default function Content() {
  return (
    <>
      <PageHeader
        title="Content"
        description="Recent work imported from the platforms you publish on."
      />
      <EmptyState
        title="No content imported"
        description="Connect a platform and your latest posts, videos and articles appear here automatically."
      />
    </>
  );
}
