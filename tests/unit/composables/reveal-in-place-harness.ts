import { flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';
import { type Ref, ref } from 'vue';
import { useRevealInPlace } from '@/composables/useRevealInPlace';
import { withSetup } from './with-setup';

/** jsdom lays nothing out, so where the heading sits is stated by hand: the viewport is 768 px. */
export const ON_SCREEN = new DOMRect(0, 100, 300, 200);
export const ABOVE_THE_VIEWPORT = new DOMRect(0, -400, 300, 200);
export const BELOW_THE_VIEWPORT = new DOMRect(0, 900, 300, 200);

export const placeHeadingAt = (rect: DOMRect): void =>
  void vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);

export function aSection(): HTMLElement {
  const section = document.createElement('section');

  document.body.append(section);

  return section;
}

/** `tabIndex = -1` makes the heading focusable, as the row heading is in the app. */
export function aHeading(): HTMLElement {
  const heading = document.createElement('h2');

  heading.tabIndex = -1;
  heading.textContent = 'Drama';
  document.body.append(heading);

  return heading;
}

/** Runs the composable inside a mounted host; it returns nothing, so the host returns a ref. */
export function mountReveal(
  section: HTMLElement | null,
  heading: HTMLElement | null,
  isRevealed: boolean,
): void {
  const sectionRef = ref(section);
  const headingRef = ref(heading);

  withSetup(() => {
    useRevealInPlace(sectionRef, headingRef, () => isRevealed);

    return headingRef;
  });
}

/** A section mounted while another one is revealed, the way a row sits behind an open grid. */
export function mountHiddenSection(
  section: HTMLElement,
  heading: HTMLElement | null,
): Ref<boolean> {
  const isRevealed = ref(false);
  const sectionRef = ref(section);
  const headingRef = ref(heading);

  withSetup(() => {
    useRevealInPlace(sectionRef, headingRef, () => isRevealed.value);

    return headingRef;
  });

  return isRevealed;
}

/** The reveal lands in the next render, so the watcher runs after a flush. */
export async function revealSection(isRevealed: Ref<boolean>): Promise<void> {
  isRevealed.value = true;
  await flushPromises();
}

export async function hideSection(isRevealed: Ref<boolean>): Promise<void> {
  isRevealed.value = false;
  await flushPromises();
}
