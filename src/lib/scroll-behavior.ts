const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * A jump the reader asked for, or back to a place they already had, is never animated: `'auto'`
 * would defer to the `scroll-behavior: smooth` the stylesheet asks for.
 */
export const INSTANT_SCROLL: ScrollBehavior = 'instant';

/** Smooth scrolling unless the reader asked the OS for reduced motion. */
export const preferredScrollBehavior = (): ScrollBehavior =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth';
