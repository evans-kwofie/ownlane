'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function ScrollReadingText({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const update = () => {
      frame = 0;
      const { top, height } = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (viewport * 0.7 - top) / (viewport * 0.7 + height)));
      element.style.setProperty('--reading-progress', progress.toString());
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    if (reducedMotion.matches) {
      element.style.setProperty('--reading-progress', '1');
      return;
    }

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return (
    <p className="reading-text mt-16 max-w-4xl text-3xl font-black leading-[0.94] tracking-[-0.06em] sm:text-5xl" ref={elementRef}>
      {children}
    </p>
  );
}
