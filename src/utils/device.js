/**
 * Consider desktop when viewport width >= 1024px (Tailwind lg breakpoint).
 * This keeps student access available on mobile and tablet.
 */
export const isDesktopViewport = () =>
  typeof window !== 'undefined' && window.innerWidth >= 1024;
