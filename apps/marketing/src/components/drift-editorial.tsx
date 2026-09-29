'use client';

import { useState } from 'react';
import Image from 'next/image';

const findings = [
  ['Outdated bio', 'X'],
  ['Old handle', 'GitHub'],
  ['Dead link', 'Instagram'],
];

const PHOTO = '/images/prototypes/fashion-designer.jpg';

const versions = {
  x: { label: 'Still introducing her as', value: 'Freelance designer · Open to work', tag: 'Two years behind', current: false },
  ownlane: { label: 'The record says', value: 'Creative director · Brooklyn, NY', tag: 'Current', current: true },
} as const;

export function DriftEditorial() {
  const [version, setVersion] = useState<keyof typeof versions>('x');
  const active = versions[version];

  return (
    <section className="scroll-mt-24 bg-background" id="drift">
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1200px] grid-cols-[minmax(0,1fr)] items-stretch gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <h2 className="max-w-[12ch] text-[clamp(2rem,3.3vw,3rem)] leading-[0.96] font-semibold tracking-[-0.065em] text-balance">
              The old you is still online.
            </h2>
            <p className="mt-6 max-w-[38ch] text-[16px] leading-[1.72] text-black/58">
              You moved forward. Some of your profiles did not. Ownlane finds the names, bios, and
              links that still describe who you used to be.
            </p>
          </div>
          <div className="border-t border-black/10">
            {findings.map(([issue, place]) => (
              <div className="flex justify-between gap-3 border-b border-black/10 py-3.5 text-[14px]" key={issue}>
                {issue}
                <span className="text-[13px] text-black/40">{place}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-w-0 self-center">
          <div className="relative h-[380px] overflow-hidden rounded-[18px] bg-[#ddd] sm:h-[400px]">
            <Image
              alt="A designer working on her laptop in her studio"
              className="object-cover object-[42%_30%]"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              src={PHOTO}
            />
          </div>

          <div className="absolute bottom-11 left-5 w-[min(340px,calc(100%-40px))] overflow-hidden rounded-[14px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(11,11,10,0.05),0_18px_40px_-14px_rgba(11,11,10,0.28)]">
            <div className="flex items-center gap-[11px] border-b border-black/10 px-4 py-3.5">
              <span
                aria-hidden
                className="size-[34px] flex-none rounded-full border border-black/10 bg-[length:520%] bg-[position:44%_14%]"
                style={{ backgroundImage: `url(${PHOTO})` }}
              />
              <div>
                <p className="text-[13.5px] font-semibold tracking-[-0.01em]">Sophie Miller</p>
                <p className="mt-0.5 text-[11.5px] text-black/40">X profile</p>
              </div>
              <span
                className={`ml-auto font-mono text-[9.5px] tracking-[0.06em] whitespace-nowrap uppercase transition-colors ${
                  active.current ? 'text-[var(--chart-up)]' : 'text-primary'
                }`}
              >
                {active.tag}
              </span>
            </div>

            <div className="px-4 pt-3.5 pb-4">
              <p className="text-[11.5px] text-black/40">{active.label}</p>
              <p className="mt-[5px] min-h-[22px] text-[15px] font-medium tracking-[-0.015em]">{active.value}</p>
              <div className="mt-3.5 flex rounded-[10px] bg-[#efeee9] p-[3px]" role="group" aria-label="Version">
                {(
                  [
                    ['x', 'On X today'],
                    ['ownlane', 'In Ownlane'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    aria-pressed={version === key}
                    className={`flex-1 rounded-lg py-[7px] text-[12px] font-medium transition-colors ${
                      version === key ? 'bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-black/55'
                    }`}
                    key={key}
                    onClick={() => setVersion(key)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-right text-[11px] text-black/40">Photo: Unsplash</p>
        </div>
      </div>
    </section>
  );
}
