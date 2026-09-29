'use client';

import Image from 'next/image';
import { NameFinder } from '@/components/name-finder';

export function MarketingHero() {
  return (
    <section className="relative -mt-[76px] min-h-[100svh] overflow-hidden bg-black pt-[76px] text-white sm:-mt-[88px] sm:pt-[88px]">
      <Image
        alt="Creators building their presence online"
        className="object-cover object-center opacity-70"
        fill
        priority
        sizes="100vw"
        src="/images/creator-strip.png"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.16),rgba(0,0,0,0.12)_35%,rgba(0,0,0,0.86)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.14)_70%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-88px)] w-[calc(100%-2rem)] max-w-[1200px] flex-col items-center justify-end pt-36 pb-32 text-center lg:pt-44">
        <h1 className="max-w-[12ch] text-[clamp(3.5rem,7.8vw,7.3rem)] leading-[0.87] font-semibold tracking-[-0.075em] text-balance">
          Be the same person <span className="text-primary">everywhere.</span>
        </h1>
        <p className="mt-6 max-w-[47ch] text-[clamp(16px,1.5vw,18px)] leading-[1.6] text-white/68">
          One home for your name, profile, links and platforms—kept connected, current and unmistakably yours.
        </p>
        <div className="mt-8 min-h-[190px] w-full max-w-[560px] text-left text-black">
          <NameFinder appearance="integrated" id="hero-name" />
        </div>
      </div>
    </section>
  );
}
