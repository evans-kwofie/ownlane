You need credentials for 23 connection families. Several providers share one developer application, while others do not offer suitable OAuth access.

Do not send client secrets through chat or commit them. Store production secrets with Cloudflare Workers Secrets.

## Prepare these shared requirements first

Most provider reviews will require:

- A production domain and fixed HTTPS callback URLs.
- Privacy policy.
- Terms of service.
- User-data deletion instructions or callback.
- Support email on your domain.
- Ownlane logo and application description.
- Explanation of every requested permission.
- A working connection flow.
- Reviewer test credentials.
- Screen-recorded demonstrations.
- Business verification for Meta and some partner APIs.
- Secure token encryption and revocation.
- Webhook endpoints and verification secrets.

I recommend this callback convention:

```text
https://useownlane.com/oauth/callback/{provider}
```

Examples:

```text
https://useownlane.com/oauth/callback/github
https://useownlane.com/oauth/callback/google
https://useownlane.com/oauth/callback/meta
```

Do not register final callback URLs until we confirm the production dashboard origin.

## Standard OAuth applications

| Provider | Credentials to obtain | Additional requirements |
|---|---|---|
| GitHub | Client ID, Client Secret | Prefer a GitHub App eventually; it offers finer permissions and short-lived tokens. [GitHub documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) |
| GitLab | Application ID, Secret | Register redirect URI and scopes such as `read_user`, `profile`, and possibly `api`. [GitLab documentation](https://docs.gitlab.com/integration/oauth_provider/) |
| Discord | Client ID, Client Secret | Register redirect URI. Add a bot token only if Ownlane later manages Discord servers. [Discord OAuth documentation](https://discord.com/developers/docs/topics/oauth2) |
| Reddit | Client ID, Client Secret | Create a confidential web application and register an exact redirect URI. API access may require Reddit approval. [Reddit OAuth documentation](https://github.com/reddit-archive/reddit/wiki/OAuth2) |
| Twitch | Client ID, Client Secret | Developer account requires 2FA and registered callback URLs. [Twitch registration](https://dev.twitch.tv/docs/authentication/register-app) |
| Vimeo | Client ID, Client Secret | Register an API application and OAuth callback. [Vimeo authentication](https://developer.vimeo.com/api/reference/authentication-extras) |
| Dribbble | Client ID, Client Secret | Register callback and request only `public` initially. [Dribbble OAuth](https://developer.dribbble.com/v2/oauth/) |
| Figma | Client ID, Client Secret | Public applications require Figma review; the app must belong to a team or organization. [Figma OAuth](https://developers.figma.com/docs/rest-api/oauth-apps/) |
| WordPress.com | Client ID, Client Secret | Works for WordPress.com and Jetpack-connected sites. Self-hosted WordPress needs a separate application-password flow. [WordPress OAuth](https://developer.wordpress.com/docs/api/oauth2/) |
| beehiiv | Client ID, Client Secret | Contact beehiiv Support to register an OAuth client. [beehiiv OAuth](https://developers.beehiiv.com/oauth2) |
| Spotify | Client ID, Client Secret | Register redirect URLs. Development mode is heavily restricted; broad production access requires extended quota approval. [Spotify apps](https://developer.spotify.com/documentation/web-api/concepts/apps), [quota requirements](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) |
| SoundCloud | Client ID, Client Secret | Artist Pro is required to register an app; SoundCloud now requires OAuth 2.1 with PKCE. [SoundCloud registration](https://developers.soundcloud.com/docs/api/register-app) |
| Pinterest | App ID, Client Secret | Register redirect URI and scopes; production access may require review. [Pinterest OAuth](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/) |
| Snapchat Login | Confidential OAuth Client ID, Client Secret | Login Kit exposes limited identity data. The Public Profile API is separately allowlisted. [Snap Login Kit](https://www.developers.snap.com/snap-kit/login-kit/overview), [Public Profile access](https://developers.snap.com/marketing-api/Public-Profile-API/GetStarted) |
| TikTok | Client Key, Client Secret | Add Login Kit, register HTTPS redirect URI, and submit the app and additional scopes for review. [TikTok Login Kit](https://developers.tiktok.com/docs/en/login-kit-overview) |
| X | OAuth 2 Client ID, Client Secret | Also retain API Key, API Secret and Bearer Token if issued. Useful API access may require a paid tier. |
| LinkedIn | Client ID, Client Secret | Basic OpenID profile access is self-service; most organization/profile-management permissions require product or partner approval. [LinkedIn access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access), [OAuth flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) |

## Shared provider ecosystems

### Meta: Facebook, Instagram, Threads and WhatsApp

Start with:

```text
META_APP_ID
META_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN
```

Create a Meta Business portfolio and a Business-type Meta developer application. Add the relevant products/use cases:

- Facebook Login for Business.
- Facebook Pages API.
- Instagram API with Instagram Login or Facebook Login.
- Threads API.
- Webhooks.
- WhatsApp Business Platform.

Expect:

- Business verification.
- Domain verification.
- Privacy policy and deletion URL.
- Advanced Access review for non-basic permissions.
- Review videos and test accounts.
- Separate permission reviews for Facebook Pages, Instagram, Threads and WhatsApp.

Instagram management generally applies to professional accounts, not ordinary personal accounts. Facebook Page access requires the connecting person to have the necessary Page permissions.

For WhatsApp Embedded Signup you will additionally need:

```text
META_WHATSAPP_CONFIG_ID
META_WHATSAPP_APP_ID
META_WHATSAPP_APP_SECRET
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN
```

You will also encounter customer-specific values after connection:

- Business portfolio ID.
- WhatsApp Business Account ID.
- Phone Number ID.
- Access token or system-user authorization.
- Webhook subscription.

WhatsApp production onboarding requires App Review and advanced permissions such as `business_management` and `whatsapp_business_management`. [Meta Embedded Signup documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

One Meta app may support several products, but separate apps can reduce review complexity and security blast radius.

### Google: YouTube and Google Business Profile

One Google Cloud project can supply:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Configure:

- OAuth consent screen.
- Authorized domain.
- HTTPS redirect URI.
- YouTube Data API v3.
- Google Business Profile APIs.
- Offline access for refresh tokens.
- Test users while the consent screen remains in testing.

YouTube requires user OAuth; service accounts do not work for YouTube channels. Sensitive scopes may require Google verification. [YouTube OAuth](https://developers.google.com/youtube/v3/guides/authentication)

Google Business Profile additionally requires API access approval before OAuth credentials alone become useful. [Business Profile OAuth](https://developers.google.com/my-business/content/implement-oauth)

## Commerce applications

| Provider | Credentials | Additional requirements |
|---|---|---|
| Shopify | Client ID, Client Secret | Create an app in Shopify’s Dev Dashboard, configure scopes, app URL, redirects, webhooks and distribution. [Shopify credentials](https://shopify.dev/docs/apps/build/authentication-authorization/manage-credentials) |
| Etsy | Keystring, Shared Secret | Etsy requires the API key on every request plus OAuth 2.0 with PKCE for user operations. [Etsy authentication](https://developers.etsy.com/documentation/essentials/authentication/) |
| Amazon | Login with Amazon Client ID and Client Secret | An Amazon influencer storefront is not exposed as an ordinary profile OAuth connection. Seller Central integration requires SP-API registration, roles, application approval and annual refresh-token authorization. [Amazon onboarding](https://developer-docs.amazon.com/sp-api/docs/onboarding-overview) |

Amazon Storefront should remain planned until we decide whether Ownlane targets sellers through SP-API or only public storefront links.

## Nonstandard authentication

### Telegram

Telegram does not use a conventional developer client secret for website login.

You need:

```text
TELEGRAM_BOT_ID
TELEGRAM_BOT_TOKEN
```

Create a bot through BotFather and register the Ownlane domain. Telegram now offers an OpenID Connect login flow based on the bot identity. [Telegram login](https://core.telegram.org/bots/telegram-login)

This authenticates a Telegram person; channel or business management requires separate bot administration and permissions.

### Apple Music

Apple Music does not use a typical OAuth client ID and secret.

You need:

```text
APPLE_TEAM_ID
APPLE_MUSIC_KEY_ID
APPLE_MUSIC_MEDIA_ID
APPLE_MUSIC_PRIVATE_KEY
```

Requirements:

- Paid Apple Developer membership.
- Media identifier.
- Media Services private key.
- Developer-token generation.
- MusicKit user authorization to obtain Music User Tokens.

[Apple key setup](https://developer.apple.com/help/account/capabilities/create-a-media-identifier-and-private-key), [Music user authentication](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)

Apple Music gives access to subscriber library functionality; it is not a general artist-profile editing API.

### Ghost

Ghost does not offer a universal Ownlane OAuth application. Each Ghost site creates a custom integration and supplies:

```text
Site URL
Content API key
Admin API key
```

This is a user-supplied credential flow, not centralized OAuth. [Ghost custom integrations](https://ghost.org/integrations/custom-integrations/)

## Currently blocked or unsuitable

### Medium

Do not create credentials. Medium is not accepting new API integrations or issuing new integration tokens. [Medium’s official notice](https://help.medium.com/hc/en-us/articles/213480228-API-Importing)

Keep it as:

- Public link.
- Manual identity checklist.
- RSS/content import where permitted.

### Substack

Substack now publishes Developer API terms, but broadly documented self-service OAuth client registration is not presently clear. Treat it as partner/contact-required until Substack grants developer access. [Substack API terms](https://substack.com/api-tos)

### Behance

Do not create credentials yet. Adobe’s general OAuth credentials do not automatically provide a supported public Behance profile-management API. Keep Behance as public-link/manual-only until Adobe confirms access.

### Facebook personal profiles, LinkedIn personal profiles, TikTok profiles, Spotify profiles

OAuth may authenticate and read limited identity data, but it does not mean Ownlane can automatically rewrite profile fields. These must use the capability system and often remain read-only or manual.

## Recommended setup order

Create credentials in this order:

1. GitHub
2. GitLab
3. Discord
4. Twitch
5. Reddit
6. WordPress.com
7. Dribbble
8. Figma
9. Google/YouTube
10. Pinterest
11. TikTok
12. Meta/Facebook/Instagram/Threads
13. LinkedIn
14. Shopify
15. Etsy
16. Spotify
17. SoundCloud
18. Snapchat
19. Google Business Profile
20. WhatsApp Business
21. Apple Music
22. Amazon SP-API
23. beehiiv

The first eight have comparatively direct registration and will let us prove the shared OAuth architecture before tackling provider reviews.

Use separate development and production applications wherever the provider supports it. Only give me the resulting environment-variable names and confirmation that they are configured—never paste the secret values.