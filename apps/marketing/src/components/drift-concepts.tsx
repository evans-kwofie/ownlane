'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { SimpleIcon } from 'simple-icons';
import { siGithub, siInstagram, siX, siYoutube } from 'simple-icons';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';

type Concept = 'portrait' | 'contact-sheet' | 'system';

const concepts: Array<{ id: Concept; label: string; note: string }> = [
  { id: 'portrait', label: 'A — Human editorial', note: 'Warm, personal, photographic' },
  { id: 'contact-sheet', label: 'B — Contact sheet', note: 'Bold, fashion-led, expressive' },
  { id: 'system', label: 'C — Identity system', note: 'Precise, graphic, product-adjacent' },
];

function PlatformIcon({ icon, className = 'size-5' }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      style={{ color: `#${icon.hex}` }}
      viewBox="0 0 24 24"
    >
      <path d={icon.path} />
    </svg>
  );
}

function PortraitConcept() {
  return (
    <section className="grid min-h-[700px] overflow-hidden border border-black/15 bg-[#e9e4dc] lg:grid-cols-[1.04fr_0.96fr]">
      <div className="relative min-h-[520px] border-b border-black/15 lg:min-h-[700px] lg:border-r lg:border-b-0">
        <Image
          alt="A creative professional working in her plant-filled studio"
          className="object-cover"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          src="/images/prototypes/studio-artist.jpg"
        />

        <div className="absolute top-6 left-6 border border-black/20 bg-[#f7f4ee] px-3 py-2 font-mono text-[9px] tracking-[0.12em] uppercase">
          Sophie · today
        </div>

        <div className="absolute right-5 bottom-5 left-5 grid border border-black/20 bg-[#f7f4ee] sm:left-auto sm:w-[310px]">
          <div className="flex items-center justify-between border-b border-black/15 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <PlatformIcon icon={siX} className="size-4" />
              <span className="text-[12px] font-medium">X profile</span>
            </div>
            <span className="font-mono text-[9px] text-primary uppercase">2 years behind</span>
          </div>
          <div className="px-4 py-4">
            <p className="text-[11px] text-black/45">Still introducing her as</p>
            <p className="mt-1 text-[14px] font-medium">Freelance designer · Open to work</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
        <div>
          <p className="font-mono text-[9px] tracking-[0.13em] text-black/45 uppercase">
            Direction A · Human editorial
          </p>
          <h1 className="mt-8 max-w-[12ch] text-[clamp(3rem,5.8vw,5.8rem)] leading-[0.92] font-semibold tracking-[-0.075em] text-balance">
            The old you is still online.
          </h1>
          <p className="mt-7 max-w-[37ch] text-[16px] leading-[1.7] text-black/58">
            You moved forward. Some of your profiles did not. Ownlane finds the names, bios, and
            links that still describe who you used to be.
          </p>
        </div>

        <a
          className="mt-12 text-[9px] text-black/40 underline underline-offset-4"
          href="https://unsplash.com/photos/woman-working-at-a-desk-in-a-plant-filled-studio-laGC9MKgHIY"
          rel="noreferrer"
          target="_blank"
        >
          Photo by Hanna Lazar on Unsplash
        </a>
      </div>
    </section>
  );
}

function ContactSheetConcept() {
  return (
    <section className="min-h-[700px] overflow-hidden border border-white/15 bg-black text-white">
      <div className="grid min-h-[700px] lg:grid-cols-[0.86fr_1.14fr]">
        <div className="flex flex-col justify-between border-b border-white/15 p-7 sm:p-10 lg:border-r lg:border-b-0 lg:p-14">
          <div>
            <p className="font-mono text-[9px] tracking-[0.13em] text-white/45 uppercase">
              Direction B · Contact sheet
            </p>
            <h1 className="mt-8 max-w-[11ch] text-[clamp(3rem,5.5vw,5.6rem)] leading-[0.9] font-semibold tracking-[-0.075em] text-balance">
              One person. Three public versions.
            </h1>
          </div>

          <div className="mt-14">
            <p className="max-w-[36ch] text-[15px] leading-[1.7] text-white/55">
              Every platform captures a fragment. Over time, those fragments stop agreeing with
              each other—and with you.
            </p>
            <div className="mt-8 flex items-center gap-3 font-mono text-[9px] tracking-[0.11em] text-primary uppercase">
              <span className="h-px w-10 bg-primary" />3 inconsistencies detected
            </div>
          </div>
        </div>

        <div className="grid min-h-[660px] grid-cols-2 grid-rows-2 gap-px bg-white/15 p-px lg:min-h-0">
          <figure className="relative row-span-2 overflow-hidden bg-black">
            <Image
              alt="Fashion designer working from her studio"
              className="object-cover object-[46%_center] opacity-90 grayscale"
              fill
              sizes="(max-width: 1024px) 50vw, 30vw"
              src="/images/prototypes/fashion-designer.jpg"
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black px-4 py-3 text-[10px]">
              <span>Current identity</span>
              <span className="font-mono text-white/45">2026</span>
            </figcaption>
          </figure>

          <figure className="relative overflow-hidden bg-black">
            <Image
              alt="A cropped version representing an older public profile"
              className="scale-125 object-cover object-[68%_35%] opacity-55 grayscale"
              fill
              sizes="(max-width: 1024px) 50vw, 30vw"
              src="/images/prototypes/fashion-designer.jpg"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-black px-4 py-3">
              <div className="flex items-center gap-2">
                <PlatformIcon icon={siGithub} className="size-3.5" />
                <span className="text-[10px]">Old handle</span>
              </div>
            </figcaption>
          </figure>

          <figure className="relative overflow-hidden bg-[#ff4d00]">
            <Image
              alt="A cropped version representing an outdated public biography"
              className="scale-150 object-cover object-[28%_50%] opacity-35 grayscale mix-blend-multiply"
              fill
              sizes="(max-width: 1024px) 50vw, 30vw"
              src="/images/prototypes/fashion-designer.jpg"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-primary px-4 py-3 text-black">
              <div className="flex items-center gap-2">
                <PlatformIcon icon={siYoutube} className="size-3.5" />
                <span className="text-[10px] font-medium">Old display name</span>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>

      <a
        className="block border-t border-white/15 px-5 py-3 text-right text-[9px] text-white/35 underline underline-offset-4"
        href="https://unsplash.com/photos/fashion-designer-working-on-a-laptop-in-her-studio-KolBZlJbiro"
        rel="noreferrer"
        target="_blank"
      >
        Photo by Vitaly Gariev on Unsplash
      </a>
    </section>
  );
}

const systemProfiles = [
  { icon: siInstagram, platform: 'Instagram', field: 'Bio', value: 'Current', good: true },
  { icon: siGithub, platform: 'GitHub', field: 'Handle', value: '@akua-makes', good: false },
  { icon: siX, platform: 'X', field: 'Bio', value: 'Open to work', good: false },
  { icon: siYoutube, platform: 'YouTube', field: 'Name', value: 'Akua M.', good: false },
];

function SystemConcept() {
  return (
    <section className="min-h-[700px] overflow-hidden border border-black/15 bg-[#f3f3ef] p-7 sm:p-10 lg:p-14">
      <div className="flex items-center justify-between border-b border-black/15 pb-5">
        <div className="flex items-center gap-2.5">
          <OwnlaneMark className="size-5 text-primary" variant="open" />
          <span className="text-[12px] font-semibold">Ownlane</span>
        </div>
        <p className="font-mono text-[9px] tracking-[0.13em] text-black/40 uppercase">
          Direction C · Identity system
        </p>
      </div>

      <div className="grid gap-12 pt-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:pt-16">
        <div>
          <h1 className="max-w-[12ch] text-[clamp(3rem,5.2vw,5.2rem)] leading-[0.92] font-semibold tracking-[-0.07em] text-balance">
            Change once. Find everywhere it didn’t.
          </h1>
          <p className="mt-7 max-w-[36ch] text-[15px] leading-[1.7] text-black/52">
            Ownlane compares every public version of you against one reference and surfaces only
            what needs attention.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between border-y border-black/20 py-4">
            <div>
              <p className="font-mono text-[9px] tracking-[0.12em] text-black/40 uppercase">
                Reference
              </p>
              <p className="mt-1.5 text-[17px] font-semibold">Akua Mensah</p>
            </div>
            <p className="font-mono text-[10px] text-primary">@akuamensah</p>
          </div>

          <div className="relative mt-10">
            <div aria-hidden="true" className="absolute top-5 right-5 left-5 h-px bg-black/20" />
            <div className="relative grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
              {systemProfiles.map((profile) => (
                <div key={profile.platform}>
                  <div className="grid size-10 place-items-center border border-black/20 bg-[#f3f3ef]">
                    <PlatformIcon icon={profile.icon} className="size-4" />
                  </div>
                  <p className="mt-4 text-[11.5px] font-semibold">{profile.platform}</p>
                  <p className="mt-1 font-mono text-[8px] tracking-[0.1em] text-black/38 uppercase">
                    {profile.field}
                  </p>
                  <p className={`mt-2 text-[11px] ${profile.good ? 'text-[var(--chart-up)]' : 'text-primary'}`}>
                    {profile.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 grid grid-cols-[1fr_auto] items-end border-t border-black/20 pt-5">
            <div>
              <p className="text-[13px] font-semibold">3 profiles need attention</p>
              <p className="mt-1 text-[10.5px] text-black/42">One reference. No hunting through tabs.</p>
            </div>
            <span className="font-mono text-[9px] tracking-[0.1em] text-primary uppercase">
              Review differences →
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DriftConcepts() {
  const [active, setActive] = useState<Concept>('portrait');

  return (
    <main className="min-h-screen bg-[#e8e8e4] text-black">
      <header className="border-b border-black/15 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-[0.14em] text-black/42 uppercase">
              Ownlane · Working prototypes
            </p>
            <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">
              Identity drift section
            </h1>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {concepts.map((concept) => (
              <button
                className={`border px-4 py-3 text-left transition-colors ${
                  active === concept.id
                    ? 'border-black bg-black text-white'
                    : 'border-black/15 bg-white hover:border-black/35'
                }`}
                key={concept.id}
                onClick={() => setActive(concept.id)}
                type="button"
              >
                <span className="block text-[11px] font-semibold">{concept.label}</span>
                <span className={`mt-1 block text-[9px] ${active === concept.id ? 'text-white/55' : 'text-black/42'}`}>
                  {concept.note}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] p-3 sm:p-6 lg:p-10">
        <div className="ownlane-concept-enter" key={active}>
          {active === 'portrait' ? <PortraitConcept /> : null}
          {active === 'contact-sheet' ? <ContactSheetConcept /> : null}
          {active === 'system' ? <SystemConcept /> : null}
        </div>
      </div>
    </main>
  );
}
