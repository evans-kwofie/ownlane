import type { Config } from '@react-router/dev/config';

export default {
  // The dashboard runs on the server so loaders and actions can reach D1 and
  // verify the session — a browser cannot hold a database binding or a secret.
  ssr: true,
} satisfies Config;
