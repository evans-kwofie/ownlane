import { PageHeader } from '../../components/page-header';
import { EmptyState } from '../../components/empty-state';
import type { Route } from './+types/developer';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Developer — Ownlane' }];
}

export default function Developer() {
  return (
    <>
      <PageHeader title="Developer" description="API keys, webhooks and embeddable widgets." />
      <EmptyState
        title="No keys issued"
        description="Issue an API key to read and update your identity data from your own systems."
      />
    </>
  );
}
