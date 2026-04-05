/**
 * Consider desktop when viewport width >= 1024px (Tailwind lg breakpoint).
 * Additionally, avoid treating touch-enabled devices as "desktop" so that tablets
 * (sometimes with large widths) still get the "tablet/mobile" access path.
 */
export const isDesktopViewport = () =>
  typeof window !== 'undefined' &&
  window.innerWidth >= 1024 &&
  // Heuristic: most tablets have touch enabled.
  (typeof navigator === 'undefined' ||
    (navigator.maxTouchPoints || 0) === 0);
