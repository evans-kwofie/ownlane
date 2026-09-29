'use client';

import { useEffect, useRef, useState } from 'react';
import type { SimpleIcon } from 'simple-icons';
import { siGithub, siX, siYoutube } from 'simple-icons';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';

type PlatformProfile = {
  icon: SimpleIcon;
  platform: string;
  field: string;
  driftedValue: string;
  canonicalValue: string;
  issue: string | null;
};

const profiles: PlatformProfile[] = [
  {
    icon: siGithub,
    platform: 'GitHub',
    field: 'Handle',
    driftedValue: '@akua-makes',
    canonicalValue: '@akuamensah',
    issue: 'Handle differs',
  },
  {
    icon: siX,
    platform: 'X',
    field: 'Biography',
    driftedValue: 'Freelance designer · Open to work',
    canonicalValue: 'Creative director · Accra',
    issue: 'Bio is outdated',
  },
  {
    icon: siYoutube,
    platform: 'YouTube',
    field: 'Display name',
    driftedValue: 'Akua M.',
    canonicalValue: 'Akua Mensah',
    issue: 'Name differs',
  },
];

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      fill="currentColor"
      style={{ color: `#${icon.hex}` }}
      viewBox="0 0 24 24"
    >
      <path d={icon.path} />
    </svg>
  );
}

export function DriftDemo() {
  const [aligned, setAligned] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const issueCount = aligned ? 0 : profiles.filter((profile) => profile.issue).length;

  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.22 },
    );

    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="overflow-hidden rounded-[10px] border border-black/15 bg-card shadow-[0_18px_40px_-34px_rgba(0,0,0,0.35)]"
      ref={root}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <OwnlaneMark className="size-4 text-primary" variant="open" />
          <span className="text-[12.5px] font-semibold tracking-[-0.02em]">
            Profile consistency
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Checked just now · 3 profiles
        </span>
      </div>

      <div
        className={`${revealed ? 'ownlane-audit-reference' : 'opacity-0'} border-b border-border bg-muted/60 px-5 py-4 sm:px-6`}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
              Reference profile
            </p>
            <p className="mt-2 text-[14px] font-semibold tracking-[-0.02em]">Akua Mensah</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              @akuamensah · Creative director · Accra
            </p>
          </div>
          <div className="mt-0.5 flex shrink-0 items-center gap-2 text-[10px] font-medium text-primary">
            <span className="size-1.5 bg-primary" />
            Source of truth
          </div>
        </div>
      </div>

      <div aria-live="polite">
        {profiles.map((profile, index) => {
          const current = aligned || !profile.issue;
          const value = aligned ? profile.canonicalValue : profile.driftedValue;

          return (
            <div
              className={`${revealed ? 'ownlane-audit-row' : 'opacity-0'} grid gap-3 border-b border-border px-5 py-4 transition-colors duration-300 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)_112px] sm:items-start sm:gap-5 sm:px-6`}
              key={profile.platform}
              style={{ animationDelay: `${120 + index * 90}ms` }}
            >
              <div className="flex items-center gap-2.5">
                <BrandIcon icon={profile.icon} />
                <span className="text-[12.5px] font-medium">{profile.platform}</span>
              </div>

              <div className="min-w-0 pl-7 sm:pl-0">
                <p className="font-mono text-[8.5px] tracking-[0.1em] text-muted-foreground uppercase">
                  {profile.field}
                </p>
                <p
                  className={`mt-1 truncate text-[12px] transition-colors duration-300 ${
                    current ? 'text-foreground/70' : 'text-foreground'
                  }`}
                  key={`${profile.platform}-${aligned ? 'aligned' : 'drifted'}`}
                >
                  <span className="ownlane-drift-value inline-block">{value}</span>
                </p>
                {!current ? (
                  <p className="mt-1.5 truncate text-[10px] text-muted-foreground">
                    Expected: {profile.canonicalValue}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 pl-7 sm:justify-end sm:pt-4 sm:pl-0">
                <span
                  className={`size-1.5 rounded-full transition-colors duration-300 ${
                    current ? 'bg-chart-up' : 'bg-primary'
                  }`}
                />
                <span
                  className={`text-[10.5px] font-medium transition-colors duration-300 ${
                    current ? 'text-[var(--chart-up)]' : 'text-primary'
                  }`}
                  key={`${profile.platform}-status-${aligned ? 'aligned' : 'drifted'}`}
                >
                  <span className="ownlane-drift-value inline-block">
                    {current ? 'Current' : profile.issue}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`${revealed ? 'ownlane-audit-footer' : 'opacity-0'} flex flex-col gap-4 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
      >
        <div>
          <p className="text-[12.5px] font-medium">
            {issueCount === 0 ? 'Every profile tells the same story.' : `${issueCount} differences found`}
          </p>
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            {aligned ? 'One identity, represented consistently.' : 'Compared with the canonical identity above.'}
          </p>
        </div>
        <button
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-foreground px-4 text-[12px] font-medium text-background transition-opacity hover:opacity-85"
          onClick={() => setAligned((value) => !value)}
          type="button"
        >
          {aligned ? 'Show the drift again' : 'Preview them aligned'}
        </button>
      </div>
    </div>
  );
}
