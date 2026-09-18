# Frontend engineering guide

This is the default way we build Ownlane interfaces. It applies to both apps, with the dashboard as the main consumer of interactive product UI.

## Principles

- Prefer accessible primitives over one-off custom controls.
- Make the shared package the visual source of truth. Do not copy a button, input, dialog, toast, or menu into an app.
- Keep durable product data on the server. Client state is for UI state, not a second database.
- Validate every user-controlled value at the boundary: browser for feedback, server for trust.
- Give every state a design: loading, empty, error, permission denied, disconnected, and success.

## Default stack

| Concern | Default | Use it for | Do not use it for |
| --- | --- | --- | --- |
| Shared UI | shadcn/ui primitives in `@ownlane/ui` | Buttons, inputs, dialogs, menus, cards, toasts, layout primitives | Copying components into an app or styling a native control from scratch when a shared primitive exists |
| Styling | Tailwind CSS v4 + shared CSS tokens | Layout, responsive rules, component composition | Arbitrary hex values or ad-hoc radii when a semantic token exists |
| Forms | React Hook Form | Any non-trivial editable form, especially profile and connection settings | A single search/filter field or trivial local toggle |
| Validation | Zod | Form schemas, route/API inputs, environment parsing, provider payload boundaries | Trusting client-only validation |
| Client UI state | Zustand | Cross-route ephemeral UI state: sidebar, selected workspace, command palette, drafts, local sync progress | Remote data, authenticated user records, or data that must survive another device/session |
| Remote data | React Router loaders/actions first | Dashboard reads, writes, mutations, revalidation, permission-aware data | Fetching the same server records into Zustand |
| Server/cache state | Cloudflare D1, KV, R2, Queues | Durable data, cache, assets, background work | Browser storage as a source of truth |

## UI and visual language

`packages/ui` owns primitives and tokens. Apps compose those primitives into product-specific features.

- Primary action color is Ownlane orange: `#ff4d00` (`primary`). Its foreground is black.
- Foundations are black and white, with neutral surfaces only where hierarchy needs them.
- Use semantic Tailwind colors: `bg-primary`, `text-foreground`, `border-border`, `text-muted-foreground`. Do not introduce a local `#ff4d00` just to make a normal button.
- The global radius is `1rem`. Buttons and inputs are rounded; cards and dialogs are more rounded. Never use `rounded-none`, `radius-none`, or sharp rectangular UI controls.
- Use component variants before adding classes. Extend a shared primitive when a pattern will recur; do not create a visual language in one route.
- Use `lucide-react` icons through shared components. Icons must have an accessible text label unless the surrounding control has one.

### Adding a component

1. Add a reusable shadcn primitive to `packages/ui/src/components`.
2. Preserve Ownlane tokens and radius conventions while adapting it.
3. Export it via the existing `@ownlane/ui/components/*` pattern.
4. Compose it in `apps/dashboard` or `apps/marketing`; app code should not fork the primitive.

## Forms and validation

Use React Hook Form plus Zod for a product form. Put schemas close to the domain rather than inside the page component.

```ts
import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  bio: z.string().trim().max(500),
  website: z.url().optional().or(z.literal('')),
});

export type ProfileInput = z.infer<typeof profileSchema>;
```

- The client uses the schema through `zodResolver` for immediate field-level feedback.
- The action/API validates the same schema again with `safeParse`; it returns structured field errors and never trusts browser values.
- Use adapters around shared `Input`, `Label`, and error text so errors, descriptions, `aria-invalid`, and `aria-describedby` are consistently connected.
- Use `defaultValues` deliberately. Reset only when server data changes or after a successful save; do not overwrite an active edit during revalidation.
- Keep file uploads separate from metadata forms. Obtain an authorised upload target from the server, upload to R2, then submit the asset reference.

## State management

### React Router owns server state

Use route loaders for initial protected data and actions for mutations. After a mutation, revalidate the affected loader(s). This gives the UI permissions-aware server data without a separate client cache by default.

- A loader scopes every query to the authenticated organization and actor.
- An action re-authorizes; client UI visibility is never permission enforcement.
- Prefer optimistic UI only when a reversible change has a clear failure path. Provider profile sync is asynchronous: show queued/running/completed/failed status from the server instead.

### Zustand owns small, ephemeral shared state

A Zustand store is appropriate for dashboard navigation, active organization selection before navigation, command-menu visibility, recoverable client-only drafts, and unsubmitted wizard progress.

Keep stores narrow and domain-named: `useDashboardUiStore`, `useProfileDraftStore`. Select individual fields rather than subscribing to a whole store. Never put OAuth tokens, permission decisions, full server records, or API responses in Zustand.

Persist only harmless preferences or an explicitly recoverable draft. Version persisted state and clear it on sign-out/account switch.

## Error, loading, and feedback rules

- Use skeletons for known page structure, not generic spinners replacing an entire dashboard.
- Use inline field errors for validation, an alert/banner for page-level recoverable errors, and Sonner toasts for completed background actions or brief confirmations.
- A toast never substitutes for a persistent sync result, audit entry, or form error.
- Show a clear empty state with the next useful action.
- Every destructive operation needs a confirmation dialog, exact target language, and a pending state.

## Data boundaries and security

- Browser code may use only `VITE_*` public configuration. Secrets, Clerk secret keys, provider tokens, encryption keys, and Cloudflare bindings stay server-side.
- Zod schemas validate external input: forms, URL parameters, webhook payloads, OAuth callback data, and provider responses.
- Do not use localStorage for credentials or canonical profile data.
- Treat client authorization as presentation only. Workers enforce organization membership and permissions for every data access and job submission.

## File placement

```text
packages/ui/src/
  components/        # reusable shadcn-based primitives
  lib/utils.ts       # shared UI helpers
  styles/globals.css # Ownlane visual tokens

apps/dashboard/app/
  components/        # dashboard-specific compositions
  features/<domain>/
    schema.ts        # Zod schema and inferred types
    form.tsx         # React Hook Form composition
    actions.server.ts # mutations and authorization boundary
    queries.server.ts # loader/query helpers
    store.ts         # optional narrow Zustand UI store
  routes/            # route composition and loader/action wiring
```

Marketing stays deliberately light: shared visual primitives, static/edge-rendered content, and no dashboard state stores.

## Before merging UI work

- Reused a shared primitive or added one to `@ownlane/ui`.
- Used semantic theme tokens and rounded controls.
- Added Zod validation on the server boundary.
- Used React Hook Form for a non-trivial form.
- Kept remote data out of Zustand.
- Designed loading, empty, error, disabled, and success states.
- Checked keyboard access, visible focus, labels, and mobile layout.

## Implementation handoff

After completing an implementation, report what changed and that the work is done. Do not run `pnpm build`, start a development server, open Chromium, or perform browser-based manual testing unless explicitly asked. The project owner handles final local testing and visual review.
