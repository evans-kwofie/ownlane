# Shared packages

This directory is for reusable Ownlane capabilities shared by two or more applications.

Expected packages, to create only when a real consumer exists:

- `ui` — design system and shared interface components
- `db` — schema, migrations, database client, and ORM
- `auth` — identity, sessions, roles, and permissions
- `payments` — provider adapters, checkout, and payouts
- `commerce` — products, orders, fulfilment, and subscriptions
- `audience` — customer profiles, consent, and events
- `config` — shared lint, TypeScript, and environment configuration

Avoid creating empty packages merely to reserve names; add a package when shared code actually needs a home.
