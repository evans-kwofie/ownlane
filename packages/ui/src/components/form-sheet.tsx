import * as React from 'react';
import { XIcon } from 'lucide-react';

import { Button } from '@ownlane/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@ownlane/ui/components/drawer';

/**
 * One shell for every form in the product: a centred dialog on a pointer-sized
 * screen, a drawer on a phone, where a dialog is awkward to reach and to type
 * into. Callers pass the fields and the footer; the shell decides the surface.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  size = 'default',
  side,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** 'wide' suits lists and timelines; forms stay at the default width. */
  size?: 'default' | 'wide' | 'extra-wide';
  /** Use a persistent-height right-side surface for detailed management views. */
  side?: 'right';
}) {
  const isSmallScreen = useIsSmallScreen();

  if (side === 'right') {
    const width =
      size === 'extra-wide'
        ? 'sm:min-w-[760px]'
        : size === 'wide'
          ? 'sm:min-w-[580px]'
          : 'sm:min-w-[460px]';

    return (
      <Drawer direction="right" onOpenChange={onOpenChange} open={open}>
        <DrawerContent className={`w-full max-w-[calc(100%-2rem)] ${width}`}>
          <DrawerHeader className="shrink-0 border-b border-border text-left">
            <DrawerTitle className="pr-10 text-[17px] font-medium tracking-[-0.01em] break-words">
              {title}
            </DrawerTitle>
            {description ? (
              <DrawerDescription className="pr-6 text-[13.5px] leading-relaxed">
                {description}
              </DrawerDescription>
            ) : null}
            <DrawerClose asChild>
              <Button
                aria-label="Close"
                className="absolute top-3 right-3"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">{children}</div>
          {footer ? (
            <DrawerFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border">
              {footer}
            </DrawerFooter>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  // Default to the dialog: a server render has no viewport, and switching to
  // the drawer after hydration is cheaper than mounting the wrong surface.
  if (!isSmallScreen) {
    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent
          className={
            size === 'extra-wide'
              ? 'sm:max-w-[760px]'
              : size === 'wide'
                ? 'sm:max-w-[580px]'
                : 'sm:max-w-[460px]'
          }
        >
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium tracking-[-0.01em] break-words">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-[13.5px] leading-relaxed">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {children}
          {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-[17px] font-medium tracking-[-0.01em] break-words">
            {title}
          </DrawerTitle>
          {description ? (
            <DrawerDescription className="text-[13.5px] leading-relaxed">
              {description}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>
        <div className="px-4">{children}</div>
        {footer ? (
          <DrawerFooter className="flex-row justify-end gap-2">{footer}</DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

const SMALL_SCREEN = '(max-width: 639px)';

function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia(SMALL_SCREEN);
    const update = () => setIsSmallScreen(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return isSmallScreen;
}
