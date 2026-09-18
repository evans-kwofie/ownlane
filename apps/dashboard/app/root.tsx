import { ClerkProvider } from '@clerk/react-router';
import { Toaster } from '@ownlane/ui/components/sonner';
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import { cloudflare } from './lib/cloudflare';

import type { Route } from './+types/root';
import './app.css';

export function links() {
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300..600&family=Geist+Mono:wght@400;500&display=swap',
    },
  ];
}

/**
 * Clerk reads the session from the request before any loader runs. The keys
 * come from the Worker's bindings, so they are never bundled into the client.
 */
export const middleware: Route.MiddlewareFunction[] = [
  (args, next) => {
    const { env } = args.context.get(cloudflare);

    return clerkMiddleware({
      publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    })(args, next);
  },
];

/** Verifies the session on the server so no page renders on an unproven claim. */
export async function loader(args: Route.LoaderArgs) {
  const { env } = args.context.get(cloudflare);

  return rootAuthLoader(args, {
    publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider
      loaderData={loaderData}
      signInUrl="/"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
    >
      <Outlet />
    </ClerkProvider>
  );
}
