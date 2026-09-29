'use client';

import { useState } from 'react';
import type { SimpleIcon } from 'simple-icons';
import { siGithub, siInstagram, siX, siYoutube } from 'simple-icons';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';
import { NameFinder } from '@/components/name-finder';
import type { NameStatus } from '@/components/name-finder';

// Same tile background as the capability gallery.
const TILE_BACKGROUND = '/images/tile-pattern.svg';

const places: { name: string; prefix: string; icon?: SimpleIcon }[] = [
  { name: 'Ownlane', prefix: 'ownlane.com/' },
  { name: 'Instagram', prefix: 'instagram.com/', icon: siInstagram },
  { name: 'GitHub', prefix: 'github.com/', icon: siGithub },
  { name: 'YouTube', prefix: 'youtube.com/@', icon: siYoutube },
  { name: 'X', prefix: 'x.com/', icon: siX },
];

const tag: Record<NameStatus, string> = {
  idle: 'Preview',
  checking: 'Checking',
  free: 'Available',
  taken: 'Taken',
  invalid: 'Preview',
  error: 'Preview',
};

function titleCase(handle: string) {
  return handle.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function FinalCta() {
  const [name, setName] = useState<{ handle: string; status: NameStatus }>({ handle: '', status: 'idle' });
  const { handle, status } = name;

  return (
    <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-14 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:py-28">
      <div className="min-w-0">
        <p className="font-mono text-[9px] tracking-[0.13em] text-primary uppercase">Start with your name</p>
        <h2 className="mt-5 max-w-[14ch] text-[clamp(2rem,3.3vw,3rem)] leading-[0.98] font-semibold tracking-[-0.06em] text-balance">
          Give your identity one place to live.
        </h2>
        <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.7] text-black/55">
          Find your Ownlane name, carry it into setup, and build the record the rest of your presence
          can follow.
        </p>
        <div className="mt-8">
          <NameFinder appearance="integrated" id="footer-name" onStatusChange={setName} />
        </div>
      </div>

      <div
        className="relative h-[460px] min-w-0 overflow-hidden rounded-2xl bg-cover bg-center"
        style={{ backgroundImage: `url(${TILE_BACKGROUND})` }}
      >
        <div className="absolute top-[11%] left-[9%] h-full w-full rounded-tl-[14px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(11,11,10,0.04),0_14px_34px_-12px_rgba(11,11,10,0.2)]">
          <div className="flex h-[46px] items-center border-b border-black/10 px-5 text-[13px] font-medium">
            Your identity
            <span className="ml-auto pr-10 font-mono text-[9.5px] tracking-[0.05em] text-black/38 uppercase">
              {tag[status]}
            </span>
          </div>

          <div className="flex items-center gap-3.5 border-b border-black/10 p-5">
            <span className="grid size-12 flex-none place-items-center rounded-full bg-[#efeee9] font-mono text-[14px] font-medium">
              {handle ? handle.slice(0, 2).toUpperCase() : '?'}
            </span>
            <div className="min-w-0 pr-10">
              <p
                className={`truncate text-[20px] font-semibold tracking-[-0.04em] ${
                  handle ? '' : 'text-black/38'
                }`}
              >
                {handle ? titleCase(handle) : 'Your name'}
              </p>
              <p className="mt-[3px] truncate text-[12px] text-black/38">
                {handle ? `ownlane.com/${handle}` : 'One record, every place'}
              </p>
            </div>
          </div>

          {places.map((place, index) => (
            <div
              className={`grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-black/10 px-5 py-[13px] text-[13px] ${
                index === 0 ? 'bg-[#f6f6f2]' : ''
              }`}
              key={place.name}
            >
              <span className="grid size-7 place-items-center rounded-lg border border-black/10 text-black/55">
                {place.icon ? (
                  <svg aria-hidden className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={place.icon.path} />
                  </svg>
                ) : (
                  <OwnlaneMark className="size-3.5 text-primary" variant="open" />
                )}
              </span>
              <span className="truncate font-mono text-[12.5px] text-black/38">
                {place.prefix}
                <b className="font-medium text-black">{handle || 'yourname'}</b>
              </span>
              <span
                className={`pr-10 font-mono text-[9.5px] tracking-[0.06em] whitespace-nowrap uppercase ${
                  index === 0 && status === 'free' ? 'text-[var(--chart-up)]' : 'text-black/38'
                }`}
              >
                {index === 0 ? (handle ? tag[status] : '') : 'Same name'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
