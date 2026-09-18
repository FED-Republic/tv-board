import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useRevealOnMount } from '@/composables/useRevealOnMount';
import { withSetup } from './with-setup';

function aSection(): HTMLElement {
  const section = document.createElement('section');

  document.body.append(section);

  return section;
}

/** `tabIndex = -1` makes the heading focusable, as the row heading is in the app. */
function aHeading(): HTMLElement {
  const heading = document.createElement('h2');

  heading.tabIndex = -1;
  heading.textContent = 'Drama';
  document.body.append(heading);

  return heading;
}

/** Runs the composable inside a mounted host; it returns nothing, so the host returns the refs. */
function mountReveal(
  section: HTMLElement | null,
  heading: HTMLElement | null,
  isRevealed: boolean,
): void {
  const sectionRef = ref(section);
  const headingRef = ref(heading);

  withSetup(() => {
    useRevealOnMount(sectionRef, headingRef, () => isRevealed);

    return sectionRef;
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRevealOnMount', () => {
  describe('when the section was just revealed', () => {
    it('given a revealed section, when mounted, then it scrolls itself into view', () => {
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, aHeading(), true);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    });

    it('given a revealed section, when mounted, then the heading is focused without a jump', () => {
      const heading = aHeading();
      const focus = vi.spyOn(heading, 'focus');

      mountReveal(aSection(), heading, true);

      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('given a revealed section, when mounted, then the heading holds focus', () => {
      const heading = aHeading();

      mountReveal(aSection(), heading, true);

      expect(document.activeElement).toBe(heading);
    });

    it('given a revealed section, when mounted, then the motion preference is never consulted', () => {
      const matchMedia = vi.spyOn(window, 'matchMedia');

      mountReveal(aSection(), aHeading(), true);

      expect(matchMedia).not.toHaveBeenCalled();
    });
  });

  describe('when nothing was revealed', () => {
    it('given a section that was already there, when mounted, then it does not scroll', () => {
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, aHeading(), false);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('given a section that was already there, when mounted, then the heading is not focused', () => {
      const heading = aHeading();
      const focus = vi.spyOn(heading, 'focus');

      mountReveal(aSection(), heading, false);

      expect(focus).not.toHaveBeenCalled();
    });
  });

  describe('when an element is missing', () => {
    it('given no section, when mounted, then nothing is thrown', () => {
      expect(() => mountReveal(null, aHeading(), true)).not.toThrow();
    });

    it('given no heading, when mounted, then nothing is thrown', () => {
      expect(() => mountReveal(aSection(), null, true)).not.toThrow();
    });
  });
});
