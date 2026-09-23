import { useEffect, useState } from 'react';
import { toast } from '@ownlane/ui/components/sonner';

import { Button } from '@ownlane/ui/components/button';
import { useWorkspacePath } from '../../../lib/workspaces';

type State = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on' | 'working';

/**
 * Lead notifications for this browser.
 *
 * A push subscription belongs to one browser, not to an account, so this reads
 * and writes the browser's own state rather than anything on the server — which
 * is why it says "this browser" throughout instead of implying it is a
 * per-account setting.
 */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [state, setState] = useState<State>('checking');
  const workspacePath = useWorkspacePath();
  const endpointUrl = `${workspacePath('/audience')}/push`;

  useEffect(() => {
    let cancelled = false;

    async function read() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !vapidPublicKey
      ) {
        if (!cancelled) setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('blocked');
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setState(existing ? 'on' : 'off');
      } catch {
        if (!cancelled) setState('unsupported');
      }
    }

    void read();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  async function enable() {
    setState('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Every browser requires this; a push with no visible notification is
        // not permitted, which suits us — every push here shows one.
        userVisibleOnly: true,
        applicationServerKey: decodeKey(vapidPublicKey ?? ''),
      });

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'subscribe', subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error('save failed');

      setState('on');
      toast.success('Notifications on for this browser');
    } catch {
      setState('off');
      toast.error('Could not turn notifications on. Try again.');
    }
  }

  async function disable() {
    setState('working');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: 'unsubscribe', endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState('off');
      toast.success('Notifications off for this browser');
    } catch {
      setState('on');
      toast.error('Could not turn notifications off.');
    }
  }

  const actionable = state === 'on' || state === 'off' || state === 'working';

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[13px]">
          Push notifications
          {/* Says plainly that this one is not saved with the rest. */}
          <span className="rounded-full bg-muted px-2 py-px text-[10.5px] font-medium text-muted-foreground">
            This browser
          </span>
        </p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {description(state)}
        </p>
      </div>
      {actionable ? (
        <Button
          className="shrink-0"
          disabled={state === 'working'}
          onClick={state === 'on' ? disable : enable}
          size="sm"
          type="button"
          variant="outline"
        >
          {state === 'working' ? 'Working…' : state === 'on' ? 'Turn off' : 'Turn on'}
        </Button>
      ) : null}
    </div>
  );
}

function description(state: State) {
  switch (state) {
    case 'checking':
      return 'Checking\u2026';
    case 'unsupported':
      return 'This browser cannot receive push notifications, or the server has no VAPID keys configured yet.';
    case 'blocked':
      return 'Blocked here. Allow notifications in this browser\u2019s site settings, then reload.';
    case 'on':
      return 'On here. You are notified when someone writes in, even with the tab closed.';
    default:
      return 'Get notified the moment a lead arrives. Each browser and device opts in separately, and this saves straight away.';
  }
}

/**
 * `applicationServerKey` wants raw bytes, and VAPID keys travel as base64url.
 */
function decodeKey(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
