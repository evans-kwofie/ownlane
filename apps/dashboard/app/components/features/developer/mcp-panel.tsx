import { CopyIcon } from 'lucide-react';

import { Button } from '@ownlane/ui/components/button';
import { toast } from '@ownlane/ui/components/sonner';

/**
 * Connecting an AI client to this workspace.
 *
 * Authentication is an Ownlane API key rather than OAuth. That is a deliberate
 * first step, not the end state: OAuth with PKCE and short-lived tokens is the
 * right answer, and it is a security-critical build of its own. A scoped,
 * revocable, expiring key is a defensible interim — and because the scopes are
 * the API's scopes, an AI client can be given strictly less than the person who
 * created it has.
 */
export function McpPanel({
  serverUrl,
  tools,
}: {
  serverUrl: string;
  tools: Array<{ name: string; scope: string; description: string }>;
}) {
  const config = JSON.stringify(
    {
      mcpServers: { ownlane: { url: serverUrl, headers: { Authorization: 'Bearer olk_live_…' } } },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/70 bg-card p-4">
        <p className="text-[14px] font-medium">Server address</p>
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          Point ChatGPT, Claude, Cursor or your own agent at this address and give it an API key as
          a bearer token. The workspace comes from the key — never from anything the model says.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-[12px]">
            {serverUrl}
          </code>
          <Button
            onClick={() =>
              navigator.clipboard
                .writeText(serverUrl)
                .then(() => toast.success('Address copied'))
                .catch(() => toast.error('Could not copy.'))
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <CopyIcon />
            Copy
          </Button>
        </div>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Client configuration
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-border/70 bg-card p-4 font-mono text-[12px] leading-relaxed">
          {config}
        </pre>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Create a key on the API keys tab and paste it in place of the placeholder.
        </p>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Tools, and the scope each needs
        </p>
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border/70 bg-card">
          {tools.map((tool) => (
            <li className="px-4 py-3" key={tool.name}>
              <p className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-[13px]">{tool.name}</code>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tool.scope}
                </span>
              </p>
              <p className="mt-0.5 max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">
                {tool.description}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">
          A client is only shown the tools its key can actually call, so it never plans around a
          capability it will then be refused. Everything is read-only, and{' '}
          <code className="font-mono">list_leads</code> needs its own scope — a key without it
          cannot reach the people who contacted you, however it is asked.
        </p>
      </section>
    </div>
  );
}
