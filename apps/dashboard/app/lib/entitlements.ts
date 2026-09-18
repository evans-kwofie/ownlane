/**
 * What the signed-in account is allowed to use.
 *
 * There is one tier today and everything is in it, so every entitlement is
 * `true`. This module exists so that stays a single decision: when billing
 * ships, `useEntitlements` starts reading the real plan and nothing else in the
 * app changes. Do not add plan checks anywhere else — ask this hook.
 *
 * @example
 * const { analytics } = useEntitlements();
 * if (!analytics) return <PlanRequired feature="analytics" />;
 */

export type Entitlement =
  | 'customDomain'
  | 'advancedSync'
  | 'analytics'
  | 'scheduling'
  | 'premiumThemes'
  | 'assetVolume'
  | 'audience'
  | 'brands'
  | 'teams'
  | 'developer';

export type Entitlements = Record<Entitlement, boolean>;

/** Everything is open while Ownlane is pre-billing. */
const ALL_OPEN: Entitlements = {
  customDomain: true,
  advancedSync: true,
  analytics: true,
  scheduling: true,
  premiumThemes: true,
  assetVolume: true,
  audience: true,
  brands: true,
  teams: true,
  developer: true,
};

export function useEntitlements(): Entitlements {
  // TODO(billing): read the account's plan and map it to these flags. Until
  // then every account gets everything — see docs/dashboard-navigation.md.
  return ALL_OPEN;
}

export function useHasEntitlement(entitlement: Entitlement): boolean {
  return useEntitlements()[entitlement];
}
