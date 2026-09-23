import { useEffect } from 'react';
import { toast } from '@ownlane/ui/components/sonner';

type ActionData = { saved?: string; error?: string } | undefined;

/**
 * Raises a toast for an action's result.
 *
 * Every action in the app answers with `saved` or `error`; without this the
 * request succeeds and the page says nothing, which reads as a control that
 * did not work. `onSuccess` runs after a successful result, for the closing
 * and resetting that should follow a save.
 */
export function useActionFeedback(
  data: ActionData,
  options?: {
    onSuccess?: () => void;
    onError?: () => void;
    /** Set false where the surface shows the error inline instead. */
    toastErrors?: boolean;
  },
) {
  const { onSuccess, onError, toastErrors = true } = options ?? {};

  useEffect(() => {
    if (!data) return;
    if (data.saved) {
      toast.success(data.saved);
      onSuccess?.();
    }
    if (data.error) {
      if (toastErrors) toast.error(data.error);
      onError?.();
    }
    // Keyed on the result itself: a new response object means a new outcome.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
}
