import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

/**
 * Transient confirmations and failures. Colours come from the theme tokens, so
 * toasts match whatever surface they appear over.
 */
const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={1.5} />,
        info: <HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={1.5} />,
        warning: <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.5} />,
        error: <HugeiconsIcon icon={CancelCircleIcon} size={16} strokeWidth={1.5} />,
        loading: (
          <HugeiconsIcon
            className="animate-spin"
            icon={Loading03Icon}
            size={16}
            strokeWidth={1.5}
          />
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

// Apps raise toasts through the design system rather than depending on the
// toast library directly.
export { Toaster, toast };
