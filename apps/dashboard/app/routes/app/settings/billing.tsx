import { EmptyState } from '../../../components/empty-state';
import type { Route } from './+types/billing';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Billing — Ownlane' }];
}

export default function BillingSettings() {
  return (
    <>
      <EmptyState
        title="Everything is included"
        description="There are no plans yet, so nothing is limited and there is nothing to pay. Every feature Ownlane has is switched on for this workspace."
      />
      <p className="mt-6 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
        When plans arrive, this is where the plan, invoices and usage will sit. Until then no
        feature is gated and no card is held.
      </p>
    </>
  );
}
