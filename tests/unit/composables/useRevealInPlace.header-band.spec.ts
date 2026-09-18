import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aHeading,
  aSection,
  mountHiddenSection,
  placeHeadingAt,
  revealSection,
} from './reveal-in-place-harness';

/** The desktop `--header-scroll-margin`: the sticky header covers the top 144 px of the page. */
const HEADER_BAND_PX = 144;
/** A heading the header hides: it ends 68 px above the band's lower edge. */
const UNDER_THE_HEADER = new DOMRect(0, 40, 300, 36);
/** The same heading a scroll step down, clear of the band. */
const BELOW_THE_HEADER = new DOMRect(0, 160, 300, 36);
const COMES_TO_THE_TOP = { block: 'start', behavior: 'instant' };

/** The row declares the band in `--header-scroll-margin`; jsdom cascades an inline value. */
function aSectionUnderTheHeader(): HTMLElement {
  const section = aSection();

  section.style.scrollMarginBlockStart = `${HEADER_BAND_PX}px`;

  return section;
}

/** A section whose computed band reads as nothing, as an engine without the property reports. */
function aSectionWithoutAHeaderBand(): HTMLElement {
  const section = aSection();
  const style = window.getComputedStyle(section);

  Object.defineProperty(style, 'scrollMarginBlockStart', { value: '', configurable: true });
  vi.spyOn(window, 'getComputedStyle').mockReturnValue(style);

  return section;
}

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRevealInPlace', () => {
  describe('when the sticky header covers the revealed heading', () => {
    it('given a heading inside the 144 px header band, when its section is revealed, then the section comes to the top of the page', async () => {
      placeHeadingAt(UNDER_THE_HEADER);
      const section = aSectionUnderTheHeader();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');
      const isRevealed = mountHiddenSection(section, aHeading());

      await revealSection(isRevealed);

      expect(scrollIntoView).toHaveBeenCalledWith(COMES_TO_THE_TOP);
    });

    it('given a heading inside the 144 px header band, when its section is revealed, then the heading takes focus', async () => {
      placeHeadingAt(UNDER_THE_HEADER);
      const heading = aHeading();
      const isRevealed = mountHiddenSection(aSectionUnderTheHeader(), heading);

      await revealSection(isRevealed);

      expect(document.activeElement).toBe(heading);
    });
  });

  describe('when the revealed heading sits below the sticky header', () => {
    it('given a heading clear of the 144 px header band, when its section is revealed, then the section stays where it is', async () => {
      placeHeadingAt(BELOW_THE_HEADER);
      const section = aSectionUnderTheHeader();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');
      const isRevealed = mountHiddenSection(section, aHeading());

      await revealSection(isRevealed);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('when the section declares no header band', () => {
    it('given a band that computes to nothing, when the section is revealed under the header, then the section stays where it is', async () => {
      placeHeadingAt(UNDER_THE_HEADER);
      const section = aSectionWithoutAHeaderBand();
      const scrollIntoView = vi.spyOn(section, 'scrollIntoView');
      const isRevealed = mountHiddenSection(section, aHeading());

      await revealSection(isRevealed);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
