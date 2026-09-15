# Ownlane

**One profile. Every platform. Always current.**

Ownlane is an online identity operating system. It gives people, brands, and agencies a canonical profile and the control to manage their public identity, links, assets, and connected accounts from one place.

## Platform

Ownlane is Cloudflare-native:

- Cloudflare Workers + Vinext — full-stack web application and API runtime
- D1 — relational product data
- R2 — profile and brand assets
- KV — short-lived OAuth state, cache, and rate limiting
- Queues — provider-sync jobs and retries
- Cron/Workflows — scheduled syncs and health checks
- Turnstile — form and signup abuse prevention

The complete product scope is in [the Identity OS specification](docs/identity-os-product-spec.md).

## Modules

Modules are ordered by dependency, not by importance. A module owns its data, routes, UI, jobs, permissions, tests, and documentation. A later module must use the public interface of an earlier module rather than reaching into its storage directly.

| # | Module | Owns | Depends on |
| --- | --- | --- | --- |
| 01 | [Auth & access](#01-auth--access) | Identity, sessions, organizations, roles | — |
| 02 | [Canonical profiles](#02-canonical-profiles) | Source-of-truth identity data | 01 |
| 03 | [Public profiles](#03-public-profiles) | Public Ownlane pages and custom domains | 02 |
| 04 | [Link control centre](#04-link-control-centre) | Links, campaigns, QR codes | 02, 03 |
| 05 | [Asset & brand library](#05-asset--brand-library) | Images, logos, brand kits | 01, 02 |
| 06 | [Provider connections](#06-provider-connections) | OAuth accounts and platform capabilities | 01, 02 |
| 07 | [Sync engine](#07-sync-engine) | Push/pull sync, jobs, retries, audit trail | 02, 05, 06 |
| 08 | [Identity health](#08-identity-health) | Audits, discrepancies, recommendations | 03, 04, 05, 06, 07 |
| 09 | [Content presence](#09-content-presence) | Imported/latest work and content campaigns | 03, 04, 06 |
| 10 | [Leads & audience](#10-leads--audience) | Contact, capture, consent, CRM | 01, 03, 04 |
| 11 | [Analytics](#11-analytics) | Events, reports, attribution | 03, 04, 09, 10 |
| 12 | [Teams & agencies](#12-teams--agencies) | Multi-brand and client operations | 01–11 |
| 13 | [Developer platform](#13-developer-platform) | APIs, webhooks, SDKs, widgets | 02–12 |
| 14 | [Billing & entitlements](#14-billing--entitlements) | Plans, usage, access limits | 01, 12 |
| 15 | [Operations & trust](#15-operations--trust) | Observability, recovery, privacy, abuse controls | 01–14 |

## 01. Auth & access

**Goal:** securely establish who is acting, which organization they belong to, and exactly what they may do.

### Features

- Email/passwordless sign-in, OAuth sign-in, passkeys, and two-factor authentication.
- Email verification, password reset, account recovery, device/session management, and login alerts.
- Personal accounts and organizations.
- Organization creation, invitations, membership lifecycle, and ownership transfer.
- Roles: owner, admin, editor, approver, analyst, client, and support operator.
- Fine-grained permissions by organization, profile, provider connection, asset, and action.
- Consent capture, terms/privacy acceptance, data export, and account deletion requests.
- Immutable security and membership audit log.
- Rate limits, Turnstile verification, suspicious-login detection, and abuse controls.

### Data owned

`users`, `auth_identities`, `sessions`, `passkeys`, `mfa_factors`, `organizations`, `organization_members`, `organization_invitations`, `roles`, `permissions`, `consents`, and `security_audit_events`.

### Interfaces exported

- `requireUser()` — authenticated user or authorization failure.
- `requireOrganizationRole(organizationId, permission)` — authorization boundary for all protected modules.
- `getActorContext()` — user, organization, role, permissions, and request metadata.
- Audit-event writer for security-sensitive actions.

### Acceptance criteria

- No protected route or job can act without an authenticated actor or scoped service identity.
- Every record owned by another module is organization-scoped.
- A user cannot read, modify, sync, or delete another organization’s data.
- Session revocation is immediate and provider credentials never reach the browser.

## 02. Canonical profiles

**Goal:** provide the source of truth for an identity before any platform is connected.

- Multiple profiles per organization: personal, brand, business, project, and campaign.
- Name, handles, bios, location, contact details, links, voice, visibility, and version history.
- Field-level source-of-truth and change approval settings.
- Templates and import from an existing profile.

## 03. Public profiles

**Goal:** give every identity a fast public home it owns.

- `ownlane.com/<slug>`, custom domains, pages, themes, SEO, Open Graph, QR/vCard, embeds, privacy, and public verification.
- Edge-rendered public pages with cache invalidation on profile changes.

## 04. Link control centre

**Goal:** make every public link deliberate, measurable, and easy to change.

- Link groups, scheduling, expiry, rotation, branded short links, UTM templates, routing, health checks, QR codes, and conversion events.
- Campaign launch/revert and platform-specific link-in-bio support.

## 05. Asset & brand library

**Goal:** keep visual identity consistent and deployment-ready.

- R2-backed uploads, folders, tags, asset metadata, image variants, crop/safe-area previews, optimisation, expiry reminders, brand kits, and approval workflow.

## 06. Provider connections

**Goal:** connect accounts safely and model platform reality honestly.

- OAuth initiation/callback/revocation, encrypted tokens, scope management, token health, account discovery, capability detection, and reconnect flow.
- Provider/field capability matrix: read, write, manual-only, unsupported, or approval-required.

## 07. Sync engine

**Goal:** apply canonical identity changes reliably across permitted accounts.

- Preview, approval, manual and scheduled sync, pull/import, conflict resolution, queue-backed execution, provider rate limits, retries, sync locks, results, notifications, and audit history.
- Guided/manual completion for fields providers do not permit Ownlane to edit.

## 08. Identity health

**Goal:** identify where a public identity is incomplete, inconsistent, or unsafe.

- Profile strength, stale-field detection, broken-link monitoring, discrepancy reports, discoverability/SEO/accessibility/trust checks, impersonation monitoring, and controlled AI recommendations.

## 09. Content presence

**Goal:** connect identity with the work that proves it.

- Import and feature recent work, content archives, embeds, campaign highlights, content calendar, attribution, and provider-permitted publishing/mentions.

## 10. Leads & audience

**Goal:** turn a public profile into an owned relationship.

- Contact forms, lead routing, email capture, WhatsApp flows, booking embeds, consent records, tags, notes, lightweight CRM, exports, and automation integrations.

## 11. Analytics

**Goal:** explain how the public identity performs without compromising visitor privacy.

- Edge event collection, views, clicks, conversions, traffic source, campaign, QR, geography/device aggregates, provider metrics, reports, and CSV export.

## 12. Teams & agencies

**Goal:** allow a team or agency to safely run many identities.

- Client workspaces, multi-brand switching, client roles, approval pipelines, shared kits/templates, bulk updates, white-label portal, seats, and usage reporting.

## 13. Developer platform

**Goal:** make Ownlane identity data useful beyond the dashboard.

- Scoped API keys, canonical-profile API, webhooks, signed endpoints, widgets, embeds, SDKs, developer logs, quotas, and integration marketplace.

## 14. Billing & entitlements

**Goal:** control paid capability cleanly without coupling plans to business logic.

- Free, Pro, Business, and Agency plans; subscriptions; seats; usage meters; add-ons; invoices; billing portal; trials; and entitlement checks.

## 15. Operations & trust

**Goal:** operate Ownlane safely at scale.

- Structured logs, traces, alerts, job replay, backup/restore testing, incident status, privacy operations, retention, provider secret rotation, risk monitoring, and internal support tools.

## Development

```bash
pnpm install
pnpm dev:web
```

The web application runs with the Cloudflare Workers-compatible Vinext runtime. Before deployment, create the Cloudflare resources referenced in [`apps/web/wrangler.jsonc`](apps/web/wrangler.jsonc), replace placeholder IDs, then apply D1 migrations and deploy:

```bash
pnpm --filter web build
pnpm --filter web deploy
```
