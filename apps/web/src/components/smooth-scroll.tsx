'use client';

import { ReactLenis } from 'lenis/react';
import { useEffect, useState, type ReactNode } from 'react';

import 'lenis/dist/lenis.css';

export function SmoothScroll({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  if (reducedMotion) return children;

  return (
    <ReactLenis
      root
      options={{
        anchors: true,
        lerp: 0.09,
        smoothWheel: true,
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
