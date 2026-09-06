import type { Config } from '@react-router/dev/config';

export default {
  // The dashboard is an authenticated application. It does not need SEO or SSR
  // at launch; React Router can enable SSR later without rewriting routes.
  ssr: false,
} satisfies Config;
