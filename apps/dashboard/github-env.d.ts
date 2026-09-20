interface Env {
  GITHUB_APP_SLUG: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  ANALYTICS_VISITOR_SALT: string;
}

declare namespace Cloudflare {
  interface Env {
    GITHUB_APP_SLUG: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    TWITCH_CLIENT_ID: string;
    TWITCH_CLIENT_SECRET: string;
    ANALYTICS_VISITOR_SALT: string;
  }
}
