import { createContext } from 'react-router';

/**
 * The Worker's bindings and execution context, handed to every loader and
 * action. Set once in `workers/app.ts`; read with `context.get(cloudflare)`.
 */
export const cloudflare = createContext<{ env: Env; ctx: ExecutionContext }>();
