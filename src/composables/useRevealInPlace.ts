import { onMounted, type Ref, watch } from 'vue';
import { INSTANT_SCROLL } from '@/lib/scroll-behavior';

/**
 * Moves focus to the heading of the section the reader just asked for, and brings the section on
 * screen only when the heading is not there already: a page that has just put the section back
 * where the reader left it keeps that offset. It fires on mount and on every later reveal,
 * because the section can stay mounted while another view covers it. The heading needs
 * `tabindex="-1"`.
 */
export function useRevealInPlace(
  section: Ref<HTMLElement | null>,
  heading: Ref<HTMLElement | null>,
  isRevealed: () => boolean,
): void {
  function reveal(): void {
    const element = heading.value;

    if (!isRevealed() || element === null) {
      return;
    }

    if (!isOnScreen(element)) {
      section.value?.scrollIntoView({ block: 'start', behavior: INSTANT_SCROLL });
    }

    element.focus({ preventScroll: true });
  }

  /** The sticky header covers the top of the viewport, so a heading under it is not on screen. */
  function isOnScreen(element: HTMLElement): boolean {
    const { top, bottom } = element.getBoundingClientRect();

    return bottom > headerBandPx() && top < window.innerHeight;
  }

  /** The band `scroll-margin-block-start` keeps clear, read from the section it is set on. */
  function headerBandPx(): number {
    const element = section.value;

    if (element === null) {
      return 0;
    }

    const band = Number.parseFloat(getComputedStyle(element).scrollMarginBlockStart);

    return Number.isNaN(band) ? 0 : band;
  }

  onMounted(reveal);

  watch(isRevealed, reveal, { flush: 'post' });
}
