import * as React from 'react';

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** 'wide' suits lists and timelines; forms stay at the default width. */
  size?: 'default' | 'wide' | 'extra-wide';
}) {
  const isSmallScreen = useIsSmallScreen();

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
