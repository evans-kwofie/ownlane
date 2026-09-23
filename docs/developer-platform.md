# Developer platform — sequencing

Module 13 in the [product specification](identity-os-product-spec.md) describes a
full developer platform: API, webhooks, embeds, SDKs, MCP. This document decides
what gets built when, and records the choices that are cheap to make now and
expensive to change later.

The short version: **an API is the hardest thing in the product to change**, and
the canonical profile shape is still moving. Webhooks come first because they
commit to nothing.

## Order

| #   | Build                                    | Why here                                                                       | Waits on |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| 1   | Identity health                          | Blocked on nothing, and makes Overview's existing promise honest               | —        |
| 2   | `lead.created` webhooks, inside Audience | Outbound only: no auth system, no public contract, no versioned reads          | —        |
| 3   | Public site data layer                   | Replaces the `useState` shell; contact-form settings move to where they belong | —        |
| 4   | Read-only API, `/v0`                     | Needs the profile shape to have settled, which 1 and 3 do                      | 1, 3     |
| 5   | MCP, read-only, excluding leads          | Reuses the API's scopes and handlers                                           | 4        |
| 6   | OAuth authorization server               | Required before any third-party AI client can connect                          | 5        |
| 7   | Write scopes                             | Only once reads are stable and audited                                         | 4, 6     |
| 8   | Embeds                                   | Needs a domain, a CDN origin, and an answer to the Turnstile conflict          | domain   |

The Developer **page** stays a shell until step 4. Webhook management lives in
Audience, where the events originate — a rail destination holding a single card
teaches a navigation that does not exist yet. This follows the rule in
[the navigation map](dashboard-navigation.md): the rail trails shipped modules.

## Decisions made now

- **`/v0`, marked unstable — not `/v1`.** Shipping `/v1` owes compatibility to
  every integrator from that day. Profile fields will still be renamed.
- **The audience scope splits in two.** `audience:read` returns aggregates and
  carries no personal data; `leads:read` returns individual records with contact
  details. A reporting integration must never be able to reach the second.
- **Leads are never part of a "read-only is therefore safe" tier**, in REST or in
  MCP. Read access to leads is exfiltration of the customer's own customers, and
  it is a graver risk than most writes, which are reversible.
- **Event ids are stable across retries.** Receivers dedupe on them.
- **No `connection.health_changed` in the first release.** `token_health` is
  written when an account connects, but nothing detects a change, so there is no
  event to emit.
- **Rate limiting and audit logging are shared infrastructure, not developer
  features.** The contact form already has its own ad-hoc limiter; one primitive
  serves both.

## Webhooks: the shape

Signature header, over `${timestamp}.${rawBody}`:

```text
Ownlane-Signature: t=<unix seconds>,v1=<hex hmac-sha256>
```

The timestamp is inside the signed material, so it cannot be altered to defeat a
replay window. Store and sign the exact bytes sent — signing a re-serialised
object is the usual way this breaks.

Delivery is attempted inline through `ctx.waitUntil` from the originating
request, then handed to a queue with exponential backoff: 1m, 5m, 30m, 2h, 6h.
A `4xx` other than 408 or 429 is permanent and is not retried. An endpoint is
disabled after five consecutive permanent failures, and that state belongs in
Identity health once it exists.

Every endpoint chooses a payload mode. `minimal` sends identifiers and nothing
else, so a workspace can be notified that a lead arrived without sending a
person's contact details to a third party. `full` is the default; the point is
that the choice exists.

## What the deferred phases are actually waiting on

- **Embeds** need a domain, a CDN origin, and a resolution to the Turnstile
  conflict: a widget is bound to a hostname, so a contact form embedded on
  arbitrary customer domains either needs per-customer provisioning or a
  permissive wildcard that weakens the protection.
- **MCP over OAuth** requires Ownlane to _provide_ OAuth rather than consume it —
  2.1 with PKCE, dynamic client registration, a consent screen, refresh rotation.
  That is a phase in its own right, comparable in size to a product module, and
  it is security-critical.
