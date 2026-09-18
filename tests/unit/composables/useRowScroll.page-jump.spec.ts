import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aRowWithContent,
  aScroller,
  mountRowScroll,
  stubReducedMotion,
  VIEWPORT_WIDTH_PX,
} from './row-scroll-harness';

const LAST_PAGE_OFFSET_PX = 600;
const LAST_PAGE_INDEX = 2;
const MIDDLE_PAGE_INDEX = 1;
/** Two full viewports and a 200 px remainder, so three pages of which the last is a part one. */
const WIDE_REMAINDER_CONTENT_WIDTH_PX = 800;
const WIDE_REMAINDER_END_OFFSET_PX = WIDE_REMAINDER_CONTENT_WIDTH_PX - VIEWPORT_WIDTH_PX;
/** One viewport and a 100 px overhang: six shows where five fit, so the row still scrolls. */
const BARELY_OVERFLOWING_CONTENT_WIDTH_PX = 400;
const BARELY_OVERFLOWING_END_OFFSET_PX = 100;
const SECOND_PAGE_INDEX = 1;

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRowScroll', () => {
  describe('when a page is chosen', () => {
    it('given three whole viewports, when the last page is chosen, then the row scrolls two viewports on', () => {
      const element = aScroller();
      const scrollTo = vi.spyOn(element, 'scrollTo');
      const row = mountRowScroll(element);

      row.scrollToPage(LAST_PAGE_INDEX);

      expect(scrollTo).toHaveBeenCalledWith({ left: LAST_PAGE_OFFSET_PX, behavior: 'smooth' });
    });

    it('given a remainder wider than half a viewport, when the last page is chosen, then the row scrolls to its end', () => {
      const element = aRowWithContent(WIDE_REMAINDER_CONTENT_WIDTH_PX);
      const scrollTo = vi.spyOn(element, 'scrollTo');
      const row = mountRowScroll(element);

      row.scrollToPage(LAST_PAGE_INDEX);

      expect(scrollTo).toHaveBeenCalledWith({
        left: WIDE_REMAINDER_END_OFFSET_PX,
        behavior: 'smooth',
      });
    });

    it('given a remainder wider than half a viewport, when a middle page is chosen, then the row scrolls one viewport on', () => {
      const element = aRowWithContent(WIDE_REMAINDER_CONTENT_WIDTH_PX);
      const scrollTo = vi.spyOn(element, 'scrollTo');
      const row = mountRowScroll(element);

      row.scrollToPage(MIDDLE_PAGE_INDEX);

      expect(scrollTo).toHaveBeenCalledWith({ left: VIEWPORT_WIDTH_PX, behavior: 'smooth' });
    });

    it('given content just over one viewport, when the last page is chosen, then the row scrolls to its end', () => {
      const element = aRowWithContent(BARELY_OVERFLOWING_CONTENT_WIDTH_PX);
      const scrollTo = vi.spyOn(element, 'scrollTo');
      const row = mountRowScroll(element);

      row.scrollToPage(SECOND_PAGE_INDEX);

      expect(scrollTo).toHaveBeenCalledWith({
        left: BARELY_OVERFLOWING_END_OFFSET_PX,
        behavior: 'smooth',
      });
    });

    it('given reduced motion, when a page is chosen, then the jump is not animated', () => {
      stubReducedMotion(true);
      const element = aScroller();
      const scrollTo = vi.spyOn(element, 'scrollTo');
      const row = mountRowScroll(element);

      row.scrollToPage(LAST_PAGE_INDEX);

      expect(scrollTo).toHaveBeenCalledWith({ left: LAST_PAGE_OFFSET_PX, behavior: 'auto' });
    });
  });

  describe('when the element is missing', () => {
    it('given no element, when a page is chosen, then nothing is thrown', () => {
      const row = mountRowScroll(null);

      expect(() => row.scrollToPage(LAST_PAGE_INDEX)).not.toThrow();
    });
  });
});
