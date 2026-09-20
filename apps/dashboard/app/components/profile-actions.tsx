import { useEffect, useRef, useState } from 'react';
import { Download04Icon, QrCodeIcon, Share08Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';
import { trackProfileInteraction } from '../features/analytics/client';

type ProfileActionsProps = {
  name: string;
  slug: string;
  /** Where this profile is published, used for sharing and the QR code. */
  url: string;
  tagline?: string;
};

/**
 * What a visitor can do with a profile: keep it, pass it on, or scan it. They
 * sit in the corner rather than the reading column — available without being
 * part of what the page says.
 */
export function ProfileActions({ name, slug, url, tagline }: ProfileActionsProps) {
  const [sharing, setSharing] = useState(false);
  const [showingQr, setShowingQr] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    // Desktop browsers have a share sheet too, but nobody expects the operating
    // system to take over a page there — and our own dialog offers the QR code
    // and the link. So the sheet is for touch devices only.
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

    if (isTouch && navigator.share) {
      try {
        await navigator.share({ title: name, text: tagline, url });
        trackProfileInteraction(slug, 'share');
      } catch {
        // Dismissed, which is an answer: do not then open a dialog over it.
      }

      return;
    }

    setSharing(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      trackProfileInteraction(slug, 'copy_link');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function showQr() {
    trackProfileInteraction(slug, 'qr_open');
    setShowingQr(true);
  }

  return (
    <>
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        <Button
          aria-label="Show QR code"
          className="size-9 bg-background p-0"
          onClick={showQr}
          type="button"
          variant="outline"
        >
          <HugeiconsIcon icon={QrCodeIcon} size={16} strokeWidth={1.5} />
        </Button>

        <Button
          aria-label="Share this profile"
          className="size-9 bg-background p-0"
          onClick={share}
          type="button"
          variant="outline"
        >
          <HugeiconsIcon icon={Share08Icon} size={16} strokeWidth={1.5} />
        </Button>

        <Button
          asChild
          className="h-9 gap-1.5 bg-foreground text-[13px] text-background hover:bg-foreground/90"
        >
          <a
            download
            href={`/${slug}/contact.vcf`}
            onClick={() => trackProfileInteraction(slug, 'save_contact')}
          >
            <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={1.5} />
            Save contact
          </a>
        </Button>
      </div>

      <Dialog onOpenChange={setSharing} open={sharing}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium tracking-[-0.01em]">
              Share this profile
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed">
              Anyone with the link can read the published parts of this profile.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-muted-foreground">
              {url.replace(/^https?:\/\//, '')}
            </code>
            <Button
              className="h-8 bg-background text-[12.5px]"
              onClick={copy}
              type="button"
              variant="outline"
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <Button
            className="h-9 text-[13.5px]"
            onClick={() => {
              setSharing(false);
              showQr();
            }}
            type="button"
            variant="outline"
          >
            Show QR code
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowingQr} open={showingQr}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium tracking-[-0.01em]">
              Scan to open
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed">
              Point a camera at this to open {url.replace(/^https?:\/\//, '')}.
            </DialogDescription>
          </DialogHeader>

          <QrCode url={url} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Drawn in the browser, so no request is made and nothing is stored. */
function QrCode({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import('qrious')
      .then(({ default: QRious }) => {
        if (cancelled || !canvasRef.current) return;

        new QRious({
          element: canvasRef.current,
          value: url,
          size: 220,
          background: '#ffffff',
          foreground: '#0a0a0a',
          level: 'M',
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <p className="py-6 text-center text-[13px] text-muted-foreground">
        The code could not be drawn.
      </p>
    );
  }

  return (
    <canvas
      aria-label="QR code for this profile"
      className="mx-auto rounded-lg border border-border bg-white p-2.5"
      height={220}
      ref={canvasRef}
      role="img"
      width={220}
    />
  );
}
