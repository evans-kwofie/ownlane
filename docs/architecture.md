# Repository architecture

Ownlane uses a TypeScript monorepo powered by pnpm workspaces and Turborepo.

## Layout

```text
apps/
  web/         Public marketing site and creator storefronts
  dashboard/   Authenticated creator operating dashboard
  api/         API, webhooks, background-job entry points, and integrations
packages/
  ui/          Shared design system
  db/          Database schema, migrations, queries, and ORM client
  auth/        Shared identity and authorization logic
  payments/    Payment-provider adapters and payment domain logic
  commerce/    Product, order, fulfilment, and subscription domain logic
  audience/    Customer profiles, consent, and audience events
  config/      Shared tooling and environment configuration
docs/       Product, brand, pricing, and technical decisions
```

## Application boundary

This is a monorepo with separate applications. Each app is independently deployable; shared business capabilities live in `packages/`, not inside a specific frontend.

- `apps/web` should use Next.js for public, SEO-sensitive marketing and storefront pages.
- `apps/dashboard` should use React Router Framework Mode with Vite. It is an authenticated application rather than an SEO surface, and consumes shared UI and domain packages while talking to the API rather than owning core business logic. Start in SPA mode; React Router can add SSR later if a demonstrated requirement emerges.
- `apps/api` owns HTTP APIs, payment-provider webhooks, and background-job entry points. Framework selection belongs here, independently of the frontends.

Keeping `web` and `dashboard` separate allows them to have independent release cycles, deployment policies, and performance budgets while retaining shared UI, types, and business rules.

## Package boundary

Packages own reusable capability, not a deployable surface:

- The ORM and database client belong in `packages/db`.
- Payment provider code belongs in `packages/payments`.
- Commerce and audience business rules belong in their respective packages.
- Event contracts can live alongside the domain that emits them. Create a standalone `packages/events` only once multiple domains need a neutral shared event contract.
- Background workers and webhook HTTP endpoints belong in `apps/api`; they invoke package code.

No core domain logic should be duplicated between `web`, `dashboard`, and `api`.

## UI system

Ownlane will use **shadcn/ui** as the starting point for accessible component primitives, styled with Tailwind CSS. shadcn/ui components are copied into the codebase and owned by the product, which allows Ownlane to customise their visual language, interaction details, and accessibility behaviour without depending on a rigid component-library theme.

`packages/ui` is the shared Ownlane design system. It should contain:

- Ownlane design tokens: colour, typography, spacing, radii, shadows, and motion
- Customised shadcn/ui primitives and composed components
- Shared, framework-neutral React components used by both `web` and `dashboard`

The public web and dashboard may have different layouts and visual density, but they should draw from the same core tokens and primitives. Do not import a default shadcn/ui component directly into an app when an Ownlane version belongs in `packages/ui`.

## Commands

After dependencies are installed:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
```

Root commands run their matching task across workspace packages that define it.
