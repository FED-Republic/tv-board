import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, useTemplateRef } from 'vue';
import { useRevealInPlace } from '@/composables/useRevealInPlace';
import {
  ABOVE_THE_VIEWPORT,
  aHeading,
  aSection,
  BELOW_THE_VIEWPORT,
  hideSection,
  mountHiddenSection,
  mountReveal,
  ON_SCREEN,
  placeHeadingAt,
  revealSection,
} from './reveal-in-place-harness';

/**
 * A host that renders its own heading, so Vue fills the template ref during the mount patch, as
 * it does in the components using the composable: the ref is still null while setup runs.
 */
function mountSectionWithHeading(isRevealed: boolean): HTMLElement {
  const host = defineComponent({
    name: 'RevealedSectionHost',
    setup() {
      const section = useTemplateRef<HTMLElement>('section');
      const heading = useTemplateRef<HTMLElement>('heading');

      useRevealInPlace(section, heading, () => isRevealed);

      return () =>
        h('section', { ref: 'section' }, [h('h2', { ref: 'heading', tabindex: -1 }, 'Drama')]);
    },
  });

  return mount(host, { attachTo: document.body }).get('h2').element;
}

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRevealInPlace', () => {
  describe('when a revealed section mounts with its heading on screen', () => {
    it('given a heading on screen, when mounted revealed, then it is focused without a jump', () => {
      placeHeadingAt(ON_SCREEN);
      const heading = aHeading();
      const focus = vi.spyOn(heading, 'focus');

      mountReveal(aSection(), heading, true);

      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('given a heading on screen, when mounted revealed, then it holds focus', () => {
      placeHeadingAt(ON_SCREEN);
      const heading = aHeading();

      mountReveal(aSection(), heading, true);

      expect(document.activeElement).toBe(heading);
    });

    it('given a heading on screen, when mounted revealed, then the section stays where it is', () => {
      placeHeadingAt(ON_SCREEN);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, aHeading(), true);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('when a revealed section mounts off screen', () => {
    it('given a heading above the viewport, when mounted revealed, then the section comes to the top of the page', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, aHeading(), true);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    });

    it('given a heading below the viewport, when mounted revealed, then the section comes to the top of the page', () => {
      placeHeadingAt(BELOW_THE_VIEWPORT);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, aHeading(), true);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    });

    it('given a heading above the viewport, when mounted revealed, then the heading still takes focus', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const heading = aHeading();

      mountReveal(aSection(), heading, true);

      expect(document.activeElement).toBe(heading);
    });

    it('given a heading above the viewport, when mounted revealed, then the page itself is not scrolled', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const scrollTo = vi.spyOn(window, 'scrollTo');

      mountReveal(aSection(), aHeading(), true);

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('when the heading reaches its ref only as the section renders', () => {
    it('given a heading rendered by its host, when the section mounts revealed, then it takes focus', () => {
      placeHeadingAt(ON_SCREEN);

      const heading = mountSectionWithHeading(true);

      expect(document.activeElement).toBe(heading);
    });

    it('given a heading rendered by its host, when nothing is revealed, then focus stays where it was', () => {
      placeHeadingAt(ON_SCREEN);

      mountSectionWithHeading(false);

      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('when a mounted section becomes the revealed one', () => {
    it('given a section already on the page, when it is revealed, then its heading takes focus', async () => {
      placeHeadingAt(ON_SCREEN);
      const heading = aHeading();
      const isRevealed = mountHiddenSection(aSection(), heading);

      await revealSection(isRevealed);

      expect(document.activeElement).toBe(heading);
    });

    it('given a heading on screen, when its section is revealed, then the section stays where it is', async () => {
      placeHeadingAt(ON_SCREEN);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');
      const isRevealed = mountHiddenSection(section, aHeading());

      await revealSection(isRevealed);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('given a heading above the viewport, when its section is revealed, then the section comes on screen', async () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');
      const isRevealed = mountHiddenSection(section, aHeading());

      await revealSection(isRevealed);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    });

    it('given a revealed section, when another one takes over, then its heading is not focused again', async () => {
      placeHeadingAt(ON_SCREEN);
      const heading = aHeading();
      const focus = vi.spyOn(heading, 'focus');
      const isRevealed = mountHiddenSection(aSection(), heading);
      await revealSection(isRevealed);

      await hideSection(isRevealed);

      expect(focus).toHaveBeenCalledTimes(1);
    });
  });

  describe('when nothing was revealed', () => {
    it('given a section that was already there, when mounted, then its heading is not focused', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const heading = aHeading();
      const focus = vi.spyOn(heading, 'focus');

      mountReveal(aSection(), heading, false);

      expect(focus).not.toHaveBeenCalled();
    });

    it('given a section that was already there, when mounted, then it is not scrolled into view', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, aHeading(), false);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('when an element is missing', () => {
    it('given no heading, when mounted revealed, then nothing is thrown', () => {
      expect(() => mountReveal(aSection(), null, true)).not.toThrow();
    });

    it('given no heading, when the section is revealed off screen, then it is not scrolled into view', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const section = aSection();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

      mountReveal(section, null, true);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('given no heading, when the section is revealed, then focus stays where it was', () => {
      placeHeadingAt(ON_SCREEN);

      mountReveal(aSection(), null, true);

      expect(document.activeElement).toBe(document.body);
    });

    it('given no section, when mounted revealed off screen, then nothing is thrown', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);

      expect(() => mountReveal(null, aHeading(), true)).not.toThrow();
    });
  });
});
