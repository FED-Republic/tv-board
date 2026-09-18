import { afterEach, describe, expect, it } from 'vitest';
import {
  aRowWithContent,
  aScroller,
  CONTENT_WIDTH_PX,
  defineMetric,
  mountRowScroll,
  nextFrame,
  VIEWPORT_WIDTH_PX,
} from './row-scroll-harness';

const LAST_PAGE_OFFSET_PX = 600;
const BETWEEN_PAGES_OFFSET_PX = 400;
const PAST_LAST_PAGE_OFFSET_PX = 800;
/** Two full viewports and a 200 px remainder, which is more than half a viewport. */
const WIDE_REMAINDER_CONTENT_WIDTH_PX = 800;
/** Two full viewports and a 100 px sliver, which is less than half a viewport. */
const SLIVER_CONTENT_WIDTH_PX = 700;
/** One viewport and a 100 px overhang: six shows where five fit, so the row still scrolls. */
const BARELY_OVERFLOWING_CONTENT_WIDTH_PX = 400;
const BARELY_OVERFLOWING_END_OFFSET_PX = 100;
const SECOND_PAGE_INDEX = 1;
const FIRST_PAGE_INDEX = 0;

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRowScroll', () => {
  describe('when the pages are counted', () => {
    it('given content three viewports wide, when mounted, then the row has three pages', () => {
      const row = mountRowScroll(aScroller());

      expect(row.pageCount.value).toBe(3);
    });

    it('given content that fits, when mounted, then the row has one page', () => {
      const element = aScroller({
        scrollLeft: 0,
        clientWidth: CONTENT_WIDTH_PX,
        scrollWidth: CONTENT_WIDTH_PX,
      });

      expect(mountRowScroll(element).pageCount.value).toBe(1);
    });

    it('given a remainder wider than half a viewport, when mounted, then it is a page of its own', () => {
      const element = aRowWithContent(WIDE_REMAINDER_CONTENT_WIDTH_PX);

      expect(mountRowScroll(element).pageCount.value).toBe(3);
    });

    it('given a sliver narrower than half a viewport, when mounted, then it joins the last page', () => {
      const element = aRowWithContent(SLIVER_CONTENT_WIDTH_PX);

      expect(mountRowScroll(element).pageCount.value).toBe(2);
    });

    it('given content just over one viewport, when mounted, then the row has two pages', () => {
      const element = aRowWithContent(BARELY_OVERFLOWING_CONTENT_WIDTH_PX);

      expect(mountRowScroll(element).pageCount.value).toBe(2);
    });

    it('given an unmeasured row, when mounted, then the row has no pages', () => {
      const element = aScroller({ scrollLeft: 0, clientWidth: 0, scrollWidth: 0 });

      expect(mountRowScroll(element).pageCount.value).toBe(0);
    });

    it('given a widened row, when the window resizes, then the pages are counted again', async () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      defineMetric(element, 'clientWidth', CONTENT_WIDTH_PX);
      window.dispatchEvent(new Event('resize'));
      await nextFrame();

      expect(row.pageCount.value).toBe(1);
    });
  });

  describe('when the current page is read', () => {
    it('given an unscrolled row, when mounted, then the first page is current', () => {
      const row = mountRowScroll(aScroller());

      expect(row.currentPage.value).toBe(0);
    });

    it('given the row one viewport on, when the scroll event fires, then the second page is current', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = VIEWPORT_WIDTH_PX;
      element.dispatchEvent(new Event('scroll'));

      expect(row.currentPage.value).toBe(1);
    });

    it('given the row at its end, when the scroll event fires, then the last page is current', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = LAST_PAGE_OFFSET_PX;
      element.dispatchEvent(new Event('scroll'));

      expect(row.currentPage.value).toBe(2);
    });

    it('given a position between two pages, when the scroll event fires, then the nearest is current', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = BETWEEN_PAGES_OFFSET_PX;
      element.dispatchEvent(new Event('scroll'));

      expect(row.currentPage.value).toBe(1);
    });

    it('given content just over one viewport at its end, when the scroll event fires, then the last page is current', () => {
      const element = aRowWithContent(BARELY_OVERFLOWING_CONTENT_WIDTH_PX);
      const row = mountRowScroll(element);

      element.scrollLeft = BARELY_OVERFLOWING_END_OFFSET_PX;
      element.dispatchEvent(new Event('scroll'));

      expect(row.currentPage.value).toBe(SECOND_PAGE_INDEX);
    });

    it('given content just over one viewport at its start, when the scroll event fires, then the first page is current', () => {
      const element = aRowWithContent(BARELY_OVERFLOWING_CONTENT_WIDTH_PX);
      const row = mountRowScroll(element);

      element.dispatchEvent(new Event('scroll'));

      expect(row.currentPage.value).toBe(FIRST_PAGE_INDEX);
    });

    it('given a right-to-left row one viewport on, when updated, then the second page is current', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = -VIEWPORT_WIDTH_PX;
      row.update();

      expect(row.currentPage.value).toBe(SECOND_PAGE_INDEX);
    });

    it('given a position past the last page, when updated, then the last page stays current', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = PAST_LAST_PAGE_OFFSET_PX;
      row.update();

      expect(row.currentPage.value).toBe(2);
    });
  });

  describe('when the element is missing', () => {
    it('given no element, when mounted, then the row has no pages', () => {
      expect(mountRowScroll(null).pageCount.value).toBe(0);
    });

    it('given no element, when mounted, then the first page is current', () => {
      expect(mountRowScroll(null).currentPage.value).toBe(0);
    });
  });
});
