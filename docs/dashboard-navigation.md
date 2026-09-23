# Dashboard navigation map

How the signed-in rail grows from the five items that exist today to the full
product surface in the [product specification](identity-os-product-spec.md).
This is the decided structure: build against it rather than inventing new
destinations per module.

## Principles

1. **The rail trails shipped modules.** An item enters navigation the week its
   module does real work. Empty destinations teach people a navigation they
   cannot use, and read as a product further along than it is.
2. **Routes are reserved from the start.** Every module below has its URL fixed
   here. Deep links, docs and emails can point at them before the page exists;
   nothing has to be renamed later.
3. **There is one tier today, and everything is in it.** No plan checks, no
   upsell screens, no locked sections until billing exists. The tiers noted
   below are where each module is expected to land — a planning note, not a
   condition to implement. See [Gating comes later](#gating-comes-later).
4. **Internal surfaces are not customer navigation.** Operations, trust and
   support tooling live in a separate internal app, never behind a role flag in
   the customer rail.

## The rail

Thirteen destinations, grouped. `:w` is the workspace slug — see
[Workspace in the URL](#workspace-in-the-url). Overview sits at the top; Developer and Settings
at the bottom, outside the groups.

| Group        | Item            | Route                           | Module                                  | State |
| ------------ | --------------- | ------------------------------- | --------------------------------------- | ----- |
| —            | Overview        | `/app/:w`                       | Cross-module attention surface          | Built |
| Identity     | Profile         | `/app/:w/profile`               | 1. Canonical identity profile           | Built |
| Identity     | Public site     | `/app/:w/profile/configuration` | 2. Public Ownlane profile               | Shell |
| Identity     | Assets          | `/app/:w/assets`                | 6. Asset and brand library              | Built |
| Distribution | Links           | `/app/:w/links`                 | 5. Link and campaign control centre     | Built |
| Distribution | Connections     | `/app/:w/connections`           | 3. Connected-account directory          | Built |
| Distribution | Content         | `/app/:w/content`               | 8. Cross-platform content presence      | Built |
| Insight      | Activity        | `/app/:w/activity`              | 4. Universal profile sync               | Shell |
| Insight      | Identity health | `/app/:w/health`                | 7. Quality and consistency intelligence | Shell |
| Insight      | Analytics       | `/app/:w/analytics`             | 10. Analytics                           | Built |
| Insight      | Audience        | `/app/:w/audience`              | 9. Contacts, leads, audience ownership  | Built |
| —            | Developer       | `/app/:w/developer`             | 13. Developer platform                  | Shell |
| —            | Settings        | `/app/:w/settings`              | Account, security, workspace            | Shell |

Two shells remain: **Identity health** and **Developer**. Public
site renders and has an editor, but nothing it changes is saved — it is local
component state with no loader or action, so it counts as a shell until it has a
data layer. Settings is the same. The Developer page's own sequencing is decided
separately in [developer platform sequencing](developer-platform.md).

Overview answers "what needs my attention?" — profile health, pending syncs,
broken links, connection status, recent activity. It is the sign-in destination.

**Shell** means the route, page frame and navigation exist, and the page states
plainly that the module is not ready. No invented data, no fake counts, no
screenshots-as-placeholders. A shell becomes real when it reads and writes
actual data.

### Turning a shell into a module

Each needs its data layer before it means anything. Rough order of dependency:

1. **Profile** — the canonical record everything else copies. Nothing downstream
   works without it.
2. **Connections** — provider auth and the capability model per platform.
3. **Public site** — publishes Profile, Links and Assets at an address.
4. Everything else builds on those three.

Profile, Connections, Links, Content, Assets, Analytics and Audience now read and
write real data. Audience also owns the public contact form, and the settings for
that form sit on the Audience page rather than in Public site only because Public
site has no data layer yet; they move when it gets one.

### Removed: Activity

There was an Activity destination, holding the log of what Ownlane did on a
person's behalf. It was removed rather than built, because every event worth
seeing already has a better home: a failed renewal or a broken link is a
**Health** finding, a new lead is in **Audience** beside the lead itself, and a
profile change is in **Profile** with the version history that can restore it.
What remained was a log of chores — tokens renewed at 3am, link checks that
passed — which nobody opens twice.

The case for an activity log is accountability for **outward writes**: Ownlane
changing a public identity on another platform without being asked. That case is
real, and it arrives with the sync engine. Until then Ownlane's only outward
writes are buttons a person presses themselves, and they already know.

Revisit when sync writes without a person initiating it. Not before.

## Deliberate exclusions

- **Billing** lives inside Settings (`/app/settings/billing`) until there are
  plans to change. It earns a rail item only if usage and invoices become
  something people check rather than visit once.
- **Help & support** is a control near the user menu, not a destination.
- **Team membership, invitations and roles** are Settings sections
  (`/app/settings/team`). Brands is about identities; Settings is about people.
- **Switching brand or workspace** is the switcher directly under the wordmark,
  not a nav item — what you change context with should not be a page you
  navigate to. Adding a brand opens a dialog from that switcher; there is no
  `/app/brands` route. The list of brands lives in Settings, where the rest of
  the account's structural choices are. For someone managing only themselves the
  switcher shows their own name and offers to add a brand; it never becomes a
  prominent destination.

  Each brand owns its own profile, public site, links, assets, connections, sync
  history, health score, team and analytics. Everything below the switcher in
  the rail is scoped to whichever identity is selected.

- **Trust, security and operations** (module 12) is split: user-facing security
  is in Settings; operational tooling is the internal admin app.

## Workspace in the URL

The active identity is a path segment: `/app/:workspace/health`, never ambient
state or a query parameter.

- **Two tabs, two brands.** An agency with Client A in one tab and Client B in
  another is the normal case. A cookie-held "active workspace" makes that
  impossible — the tab that switched last wins, and the other quietly writes to
  the wrong identity.
- **A pasted link is unambiguous.** It opens the workspace it names, whatever
  the recipient last had selected.
- **Loaders get it before render.** `params.workspace` keys data fetching, cache
  entries and access checks off one explicit value.

Rules that keep it simple:

1. **Slug, not raw id** — `/app/acme-studio/overview`. Ids stay internal; slugs
   are unique per account and redirect after a rename so links survive.
2. **No special case for the personal workspace.** It gets a slug like any
   other, so there is one code path. Internal links go through
   `useWorkspacePath()` rather than being assembled by hand.
3. **Account settings sit outside the segment.** `/app/account` holds sign-in
   details, the session and the list of brands — they belong to the person.
   `/app/:workspace/settings` holds only what belongs to that identity.
4. **The stored last-used slug is a preference, not the truth.** It answers one
   question — where `/app` with no workspace named should land. The URL is
   always authoritative.
5. **An unreachable slug says so.** `/app/:workspace` checks the slug against
   what the account can reach and shows a no-access screen rather than falling
   back to another identity.

Switching brand rewrites the segment and keeps the rest of the path, so
`/app/acme/health` becomes `/app/other/health` — same section, different
identity.

## Gating comes later

Plan gating is switched on once the modules are built and their tests pass —
not while they are being written. Until then:

- Every entitlement is open, and there is exactly one place that says so:
  `useEntitlements()` in `apps/dashboard/app/lib/entitlements.ts`. It returns
  every flag as `true` today, and becomes the plan lookup when billing ships.
- Ask that hook, never a plan flag of your own. One stub is a switch; twenty
  scattered `true`s are a migration.
- Keep entitlement decisions at the _feature_ boundary, not the route boundary,
  so turning gating on is a check inside a page rather than a re-routing job.
- When plans do exist: plan-gated sections keep their route and render a real
  page explaining the plan; permission-gated sections disappear from the rail
  for roles that lack them and return a not-found on direct hits.

Role-based access is a separate question and can land earlier, since teams and
invitations are account features rather than a commercial tier.

## Grouping

Flat is correct up to about seven items. At eight, group them — Overview stays
ungrouped at the top, Settings stays ungrouped at the bottom:

- **Identity** — Profile, Public site, Assets
- **Distribution** — Links, Connections, Content
- **Insight** — Health, Analytics, Audience

Developer and Settings stay ungrouped at the bottom, beside Overview at the top.
There is no Workspace group: brands are reached through the switcher, not the
rail, as [Deliberate exclusions](#deliberate-exclusions) sets out.

## Boundaries worth holding

- **Overview and Health answer one question** between them: what is broken.
  Overview summarises; Health is the audit. If a third page starts listing
  problems, it belongs in one of these.
- **Profile is data; Public site is its rendering.** Anything that changes what
  is true goes in Profile. Anything that changes how it looks goes in Public
  site.
- **Links are destinations; Content is work.** A link is something you point at.
  Content is something you made, imported from a platform.
