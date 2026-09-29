'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';

/**
 * The header, in the product's design language rather than the marketing
 * site's former one: sentence case, the shared radius, tokens instead of
 * hardcoded hex. Somebody who signs up should not feel they changed companies.
 */
const navigation = [
  { href: '/#drift', label: 'The problem', description: 'Why your profiles drift apart' },
  { href: '/#how-it-works', label: 'How it works', description: 'Define it once, keep it current' },
  { href: '/#capabilities', label: 'Capabilities', description: 'Assets, audience, links and campaigns' },
  { href: '/#faq', label: 'FAQ', description: 'Answers before you start' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="pointer-events-none sticky top-0 z-50 h-[76px] px-3 pt-2 sm:h-[88px] sm:px-5 sm:pt-3">
      <nav
        aria-label="Main navigation"
        className={`pointer-events-auto mx-auto flex w-full items-center justify-between border px-4 transition-[height,max-width,background-color,border-color,box-shadow,border-radius] duration-300 sm:px-5 ${
          scrolled
            ? 'h-[58px] max-w-[1080px] rounded-2xl border-black/[0.08] bg-background/92 text-foreground shadow-[0_16px_50px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl'
            : 'h-16 max-w-[1200px] rounded-none border-transparent bg-transparent text-white shadow-none'
        }`}
      >
        <Link
          aria-label="Ownlane home"
          className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.025em]"
          href="/"
        >
          <OwnlaneMark className="size-[19px] text-primary" variant="open" />
          Ownlane
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navigation.map((item) => (
            <Link
              className={`text-[13.5px] font-medium transition-colors ${
                scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex items-center gap-2">
            <Link
              className={`inline-flex h-9 items-center rounded-lg px-3.5 text-[13.5px] font-medium transition-colors ${
                scrolled ? 'hover:bg-black/[0.045]' : 'hover:bg-white/10'
              }`}
              href="/api/start"
            >
              Log in
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-[transform,opacity] hover:-translate-y-px hover:opacity-90"
              href="/api/start"
            >
              Get started
            </Link>
          </div>
        </div>

        <button
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-[14px] font-medium md:hidden ${
            scrolled ? 'border-border bg-background/80' : 'border-white/30 bg-black/10 text-white backdrop-blur-sm'
          }`}
          onClick={() => setMenuOpen(!menuOpen)}
          type="button"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </nav>

      {menuOpen ? (
        <div
          className="pointer-events-auto fixed inset-x-3 top-[72px] z-40 rounded-2xl border border-border bg-background/95 p-3 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:inset-x-5 sm:top-[82px] md:hidden"
          id="mobile-navigation"
        >
          <div className="mx-auto flex w-full max-w-[1120px] flex-col">
            <ul className="flex flex-col">
              {navigation.map((item) => (
                <li className="border-b border-border last:border-b-0" key={item.href}>
                  <Link
                    className="flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-muted"
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>
                      <span className="block text-[17px] font-medium tracking-[-0.02em]">{item.label}</span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{item.description}</span>
                    </span>
                    <svg
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.6"
                      viewBox="0 0 16 16"
                    >
                      <path d="M6 3.5L10.5 8 6 12.5" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-[14px] font-medium"
                href="/api/start"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-3 text-center text-[14px] font-medium text-primary-foreground"
                href="/api/start"
                onClick={() => setMenuOpen(false)}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
