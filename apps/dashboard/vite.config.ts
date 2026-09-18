import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    // The Worker entry and the React Router server build must share one
    // environment, or each gets its own copy of the load context.
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    reactRouter(),
  ],
});
