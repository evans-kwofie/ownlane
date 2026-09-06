import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // This application lives inside the Ownlane monorepo. Explicitly setting the
    // workspace root lets Turbopack resolve workspace files and dependencies.
    root: path.resolve(__dirname, '../..'),
  },
};

export default nextConfig;
