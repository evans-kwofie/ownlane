import { EarthIcon, LockedIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useFetcher } from 'react-router';

import type { ContactChannel } from '../lib/profiles';

/**
 * Whether one contact detail is published, shown on the detail itself. Typing a
 * phone number feels like publishing it, so the row has to say plainly that it
 * is not — and be the place you change that.
 */
export function ChannelVisibility({
  channel,
  isPublic,
}: {
  channel: ContactChannel;
  isPublic: boolean;
}) {
  const fetcher = useFetcher();
  const pending = fetcher.state !== 'idle';
  const next = fetcher.formData ? fetcher.formData.get('public') === 'true' : isPublic;

  return (
    <fetcher.Form method="post">
      <input name="intent" type="hidden" value="visibility" />
      <input name="channel" type="hidden" value={channel} />
      <input name="public" type="hidden" value={String(!next)} />
      <button
        className={
          next
            ? 'flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-[11.5px] font-medium transition-colors hover:bg-accent/60'
            : 'flex items-center gap-1.5 rounded-full border border-dashed border-border bg-muted/50 px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-solid hover:text-foreground'
        }
        disabled={pending}
        title={
          next
            ? 'Published — anyone can see this. Click to hide it.'
            : 'Hidden from your public profile. Click to publish it.'
        }
        type="submit"
      >
        <HugeiconsIcon icon={next ? EarthIcon : LockedIcon} size={12} strokeWidth={1.5} />
        {next ? 'Public' : 'Hidden'}
      </button>
    </fetcher.Form>
  );
}
