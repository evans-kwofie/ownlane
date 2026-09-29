# Deployment

Ownlane runs entirely on Cloudflare Workers. The dashboard Worker serves the
app, the public profiles, the embeds and the API from one deployment.

Three environments share one config file. Wrangler does **not** inherit bindings
into named environments, so each repeats its own — verbose on purpose, because a
forgotten binding should fail at deploy rather than quietly resolve to another
environment's database.

| Environment | Worker                      | Trigger           |
| ----------- | --------------------------- | ----------------- |
| development | `wrangler dev`              | local only        |
| staging     | `ownlane-dashboard-staging` | push to `staging` |
| production  | `ownlane-dashboard`         | push to `main`    |

## First-time setup, per environment

Every `REPLACE_WITH_…` in `apps/dashboard/wrangler.jsonc` is a resource that has
to exist first. Create them, then paste the ids back in.

```sh
wrangler d1 create ownlane-staging          # → database_id
wrangler kv namespace create OAUTH_STATE    # → id
wrangler r2 bucket create ownlane-assets-staging
```

Then the secrets. None of these belong in the repo:

```sh
cd apps/dashboard
for s in CLERK_SECRET_KEY OWNLANE_TOKEN_ENCRYPTION_KEY ANALYTICS_VISITOR_SALT \
         GITHUB_CLIENT_SECRET TWITCH_CLIENT_SECRET \
         TURNSTILE_SECRET_KEY VAPID_PRIVATE_KEY; do
  wrangler secret put "$s" --env staging
done
```

`VITE_CLERK_PUBLISHABLE_KEY` is publishable and belongs in `vars`.

## Deploying

```sh
pnpm deploy:staging
pnpm deploy:production
```

**The environment is chosen at build time, not deploy time.** This is the one
non-obvious thing here. `@cloudflare/vite-plugin` flattens `wrangler.jsonc` into
`build/server/wrangler.json` and **drops the `env` blocks**, and
`.wrangler/deploy/config.json` then points `wrangler deploy` at that generated
file. So `wrangler deploy --env staging` on its own silently ships the
_development_ configuration — right worker name, wrong database.

`CLOUDFLARE_ENV=staging` during the build is what resolves the environment. The
deploy scripts do this; anything calling wrangler by hand must too.

Migrations are separate, and run **before** the Worker that depends on them:

```sh
pnpm --filter dashboard migrate:staging
```

CI does both in that order on a push to `staging` or `main`. It needs
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets, and
`D1_DATABASE_NAME` as an environment variable on each GitHub environment.

## What each environment needs of its own

- **A Turnstile widget.** Widgets are bound to hostnames, so a staging domain
  needs its own site key and secret. With no secret set, verification passes —
  which is right for local development and wrong anywhere public.
- **A VAPID key pair**, from `scripts/generate-vapid-keys.mjs`. Reusing
  production's would let one environment push notifications to the other's
  subscribers.
- **Its own D1, R2 bucket and KV namespace.** Sharing any of them means staging
  tests write to production data.

## Known gaps

- **Email Routing** must be enabled on the account, with `LEAD_EMAIL_FROM` on a
  verified sending domain, and each notification recipient verified as a
  destination. Until then lead emails are skipped silently — by design, since a
  lead is already saved before email is attempted.
- **`SYNC_QUEUE` was removed** from the config. It was a producer binding that
  no code referenced, and Queues needs a paid plan; it returns with the sync
  engine that will actually use it.
- **Nothing prunes** `webhook_deliveries` or `analytics_events`. Both grow
  without bound.
