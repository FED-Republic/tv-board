import { onMounted, type Ref } from 'vue';
import { INSTANT_SCROLL } from '@/lib/scroll-behavior';

/**
 * Brings a freshly mounted section to the top of the page and moves focus to its heading, for a
 * view the reader just asked for. The section has to be new on the page every time; a section
 * that stays mounted wants `useRevealInPlace`. The heading needs `tabindex="-1"`.
 */
export function useRevealOnMount(
  section: Ref<HTMLElement | null>,
  heading: Ref<HTMLElement | null>,
  isRevealed: () => boolean,
): void {
  onMounted(() => {
    if (!isRevealed()) {
      return;
    }

    section.value?.scrollIntoView({ block: 'start', behavior: INSTANT_SCROLL });
    heading.value?.focus({ preventScroll: true });
  });
}
