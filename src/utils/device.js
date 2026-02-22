/**
 * Consider desktop when viewport width >= 768px (matches app breakpoint md).
 * Used to restrict student accounts to mobile only.
 */
export const isDesktopViewport = () =>
  typeof window !== 'undefined' && window.innerWidth >= 768;
