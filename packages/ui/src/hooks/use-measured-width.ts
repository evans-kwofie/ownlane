import * as React from 'react';

/**
 * The rendered width of an element, in CSS pixels.
 *
 * A chart drawn into a fixed viewBox and stretched to its container scales
 * everything with it — 10px axis labels and 2px strokes come out at whatever
 * the stretch factor happens to be. Measuring the container and drawing at
 * 1:1 keeps type and stroke weights at the sizes they were specified at,
 * whatever the panel is doing.
 *
 * Returns `null` until the first measurement, which is also what the server
 * renders. Give the container its final height so nothing shifts when the
 * chart paints.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    setWidth(Math.round(node.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
