# Ownlane identity operating system — product specification

## Product definition

**Ownlane is the control centre for an online identity: one canonical profile, every platform, always current.**

It gives people, creators, businesses, and agencies one source of truth for their public identity, connected accounts, links, assets, and public presence. It synchronises permitted fields directly, and gives a precise guided completion workflow where a platform does not permit programmatic updates.

This document captures the intended complete product scope following the identity-management pivot. Existing creator-commerce documents are retained as historical context until they are intentionally replaced.

## 1. Canonical identity profile

- Display name, pronunciation, handle, profile photo, cover image, and logo variants.
- Short, medium, and long bios; profession, categories, skills, location, timezone, languages, and pronouns.
- Email, phone, WhatsApp, website, booking/contact preferences, verification links, and credentials.
- Brand colours, typography, visual assets, brand voice, links, link groups, and UTM defaults.
- Media-kit details: audience, niches, rates, and past partnerships.
- Multiple identities for a person, creator, company, project, or campaign.
- Creator, freelancer, founder, artist, agency, and business templates.
- Version history, comparisons, restore, and scheduled changes.

## 2. Public Ownlane profile

- Public `ownlane.com/name` profile, custom domains/subdomains, and link-in-bio page.
- Responsive no-code mini-site with About, Links, Contact, Work, Portfolio, Press, Media Kit, and Services pages.
- Embeds for major video, audio, social, newsletter, developer, booking, and map providers.
- Featured links, campaigns, launches, announcements, private/password-protected pages, and downloadable contact cards.
- Rich previews, Open Graph controls, SEO metadata, sitemap, favicon, QR codes, themes, dark mode, custom CSS, and templates.
- Public-profile verification badge for eligible connected accounts.

## 3. Connected-account directory

- Connections for Instagram, Facebook Pages, TikTok, YouTube, X, LinkedIn, Threads, Pinterest, Snapchat, Twitch, Discord, Telegram, WhatsApp Business, Reddit, Medium, Substack, Beehiiv, GitHub, GitLab, Dribbble, Behance, Figma, Spotify, Apple Music, Google Business Profile, Shopify, Etsy, Amazon storefronts, personal sites, and custom domains.
- OAuth connection and reconnection, detected account type/scopes, token health, last successful sync, connection owner, team access, disconnect/revoke, and deletion controls.
- Per-provider field/capability display: read, write, unsupported, manual-only, or approval-required.

## 4. Universal profile sync

- Push/pull display name, avatar, bio, website/link, location, contact details, and every other provider-permitted field.
- Field-level source-of-truth choice: Ownlane, a named platform, or manual.
- Conflict resolution, selected-account batch sync, preview before change, approval gates, manual sync, scheduled sync, and smart sync windows.
- Per-account status: synced, outdated, unsupported, needs approval, expired connection, or failed.
- Sync history, audit logs, retries, rate-limit management, notifications, and rollback where technically possible.
- For blocked APIs: side-by-side differences, exact update checklists, instant copy controls, deep links to native settings where possible, completion tracking, and policy-compliant browser-extension assistance.

## 5. Link and campaign control centre

- Canonical links; website/link-in-bio sync where supported; smart routing by location, device, language, date, or campaign.
- Scheduling, expiry, rotation, branded short links, UTM builder, campaign presets, link health monitoring, QR codes, and click/conversion analytics.
- Platform character-limit assistant and generated, editable platform-specific bio variants.
- Launch mode to update selected bios/featured links at once, and revert-launch restoration.

## 6. Asset and brand library

- Profile images, logos, favicons, headers, colours, fonts, imagery, icons, folders, tags, and search.
- Provider-specific resize/crop and safe-area previews, background removal, optimisation, usage history, asset expiry/rights reminders, and approved headshot variants.
- Team/agency approval workflow and CDN delivery.

## 7. Profile quality and consistency intelligence

- Identity consistency score; missing/outdated/conflicting field detection; broken links; stale campaigns; and impersonation/handle-squatting monitoring.
- Search-result, SEO/discoverability, accessibility, and trust audits.
- Profile-strength recommendations and opt-in category benchmarks.
- AI assistance for bios, headlines, CTAs, link labels, and suggestions constrained by the user's brand voice.

## 8. Cross-platform content presence

- Feature current work on a public profile; import recent posts, videos, podcasts, repositories, products, and articles.
- Automatically updated latest-work section, campaign/category highlights, landing pages, attribution, archive, portfolio, calendar, reusable content templates, captions, hashtags, and assets.
- Scheduled publishing, mentions/UGC collection, and follower notifications only where provider APIs permit.

## 9. Contact, leads, and audience ownership

- Contact forms, inquiry routing, email capture, newsletter integrations, WhatsApp lead flows, booking embeds, and downloadable media kits.
- Lead-source attribution, lightweight CRM, tags, notes, status, consent records, unsubscribes, follow-ups, exports, webhooks, Zapier/Make/n8n integrations, and Turnstile-based anti-spam controls.

## 10. Analytics

- Views, unique visitors, link clicks, conversions, source/platform, geography, language, device, browser, referrals, campaign performance, and QR scans.
- Provider-accessible follower metrics, audience-growth snapshots, profile-change impact, scheduled reports, CSV export, and privacy/consent controls.

## 11. Teams, agencies, and multi-brand management

- Multiple identities and client workspaces; owner, admin, editor, approver, analyst, and client roles.
- Granular provider permissions, approvals, shared assets/templates, franchise/team bulk updates, white-label portal, client change requests, audit records, billing, seats, and usage reporting.

## 12. Trust, security, and privacy

- OAuth-only account connections; encrypted tokens; secret/key rotation; minimum required scopes; passkeys and two-factor authentication.
- Session/device management, login alerts, granular roles, activity logs, export/deletion controls, consent management, retention controls, abuse detection, account recovery, status communication, and applicable privacy compliance.

## 13. Developer platform

- Canonical-profile API, third-party OAuth/API access, webhooks, hosted widgets, JavaScript SDK, React/Next.js components, embed API, signed profile endpoints, digital identity/vCard endpoints, partner marketplace, developer keys, environments, quotas, logs, documentation, and playground.

## 14. Cloudflare-native architecture

- Cloudflare Pages: web app and public profiles.
- Workers: APIs, OAuth callbacks, profile operations, and webhooks.
- D1: product data, relationships, permissions, and sync records.
- R2: profile images, assets, media, and exports.
- Queues: asynchronous sync jobs, retries, and webhook processing.
- Cron Triggers: scheduled syncs, token health, link health, and reports.
- KV: short-lived OAuth state, caching, rate limits, and feature flags.
- Durable Objects: distributed sync locks and real-time activity/collaboration.
- Turnstile: signup/form abuse protection.
- Cloudflare Access: internal/admin operations.
- Workers Analytics Engine: event analytics.
- Workers AI: optional profile-quality and copy assistance.
- Secrets: provider credentials and encryption keys.
- Observability: logs, errors, sync traces, alerts, and replayable failed jobs.

## 15. Commercial model

- Free: personal profile and limited account connections.
- Pro: custom domain, advanced sync, analytics, scheduling, and premium templates.
- Business: multiple identities, teams, workflows, CRM, and APIs.
- Agency: client workspaces, approvals, white-label portal, and bulk management.
- Usage add-ons for brands, assets, sync volume, seats, and advanced analytics.
- No percentage of a user's earnings.

## Product constraint

Third-party API permissions determine which fields Ownlane can update automatically. This must be represented honestly as a provider and field-level capability model. Ownlane remains the canonical identity, change-management, asset, link, public-profile, proof, and identity-health layer even where direct platform writes are unavailable.
