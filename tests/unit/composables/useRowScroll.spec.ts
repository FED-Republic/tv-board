import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useRowScroll } from '@/composables/useRowScroll';
import {
  aScroller,
  CONTENT_WIDTH_PX,
  defineMetric,
  mountRowScroll,
  nextFrame,
  stubReducedMotion,
  VIEWPORT_WIDTH_PX,
} from './row-scroll-harness';
import { withSetup } from './with-setup';

const LAST_PAGE_OFFSET_PX = 600;
/** A right-to-left row scrolls into negative `scrollLeft` values. */
const RIGHT_TO_LEFT_OFFSET_PX = 200;

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRowScroll', () => {
  describe('when the row sits at its start', () => {
    it('given an unscrolled row, when mounted, then scrolling back is unavailable', () => {
      const row = mountRowScroll(aScroller());

      expect(row.canScrollPrev.value).toBe(false);
    });

    it('given content wider than the row, when mounted, then scrolling on is available', () => {
      const row = mountRowScroll(aScroller());

      expect(row.canScrollNext.value).toBe(true);
    });

    it('given content narrower than the row, when mounted, then scrolling on is unavailable', () => {
      const element = aScroller({ scrollLeft: 0, clientWidth: 900, scrollWidth: 900 });

      expect(mountRowScroll(element).canScrollNext.value).toBe(false);
    });
  });

  describe('when the row is scrolled', () => {
    it('given a scrolled row, when the scroll event fires, then scrolling back opens up', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = 100;
      element.dispatchEvent(new Event('scroll'));

      expect(row.canScrollPrev.value).toBe(true);
    });

    it('given the row at its end, when the scroll event fires, then scrolling on closes', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = LAST_PAGE_OFFSET_PX;
      element.dispatchEvent(new Event('scroll'));

      expect(row.canScrollNext.value).toBe(false);
    });

    it('given a sub-pixel remainder at the end, when updated, then scrolling on stays closed', () => {
      const element = aScroller({
        scrollLeft: LAST_PAGE_OFFSET_PX,
        clientWidth: VIEWPORT_WIDTH_PX,
        scrollWidth: 900.6,
      });
      const row = mountRowScroll(element);

      row.update();

      expect(row.canScrollNext.value).toBe(false);
    });

    it('given new metrics, when update is called, then the buttons follow', () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      element.scrollLeft = 300;
      row.update();

      expect(row.canScrollPrev.value).toBe(true);
    });
  });

  describe('when the viewport changes', () => {
    it('given a widened row, when the window resizes, then scrolling on closes', async () => {
      const element = aScroller();
      const row = mountRowScroll(element);

      defineMetric(element, 'clientWidth', CONTENT_WIDTH_PX);
      window.dispatchEvent(new Event('resize'));
      await nextFrame();

      expect(row.canScrollNext.value).toBe(false);
    });

    it('given a disposed scope, when the window resizes, then the buttons stop following', async () => {
      const element = aScroller();
      const scroller = ref<HTMLElement | null>(element);
      const { result, unmount } = withSetup(() => useRowScroll(scroller));

      unmount();
      defineMetric(element, 'clientWidth', CONTENT_WIDTH_PX);
      window.dispatchEvent(new Event('resize'));
      await nextFrame();

      expect(result.canScrollNext.value).toBe(true);
    });
  });

  describe('when the row reads right to left', () => {
    it('given a negative scroll offset, when mounted, then the row counts as scrolled', () => {
      const element = aScroller({
        scrollLeft: -RIGHT_TO_LEFT_OFFSET_PX,
        clientWidth: VIEWPORT_WIDTH_PX,
        scrollWidth: CONTENT_WIDTH_PX,
      });

      expect(mountRowScroll(element).canScrollPrev.value).toBe(true);
    });
  });

  describe('when an arrow is pressed', () => {
    it('given a row, when scrolling on, then it moves one viewport forward', () => {
      const element = aScroller();
      const scrollBy = vi.spyOn(element, 'scrollBy');
      const row = mountRowScroll(element);

      row.scrollNext();

      expect(scrollBy).toHaveBeenCalledWith({ left: VIEWPORT_WIDTH_PX, behavior: 'smooth' });
    });

    it('given a row, when scrolling back, then it moves one viewport backward', () => {
      const element = aScroller();
      const scrollBy = vi.spyOn(element, 'scrollBy');
      const row = mountRowScroll(element);

      row.scrollPrev();

      expect(scrollBy).toHaveBeenCalledWith({ left: -VIEWPORT_WIDTH_PX, behavior: 'smooth' });
    });

    it('given reduced motion, when scrolling on, then the jump is not animated', () => {
      stubReducedMotion(true);
      const element = aScroller();
      const scrollBy = vi.spyOn(element, 'scrollBy');
      const row = mountRowScroll(element);

      row.scrollNext();

      expect(scrollBy).toHaveBeenCalledWith({ left: VIEWPORT_WIDTH_PX, behavior: 'auto' });
    });
  });

  describe('when the element is missing', () => {
    it('given no element, when mounted, then scrolling on is unavailable', () => {
      expect(mountRowScroll(null).canScrollNext.value).toBe(false);
    });

    it('given no element, when scrolling on, then nothing is thrown', () => {
      const row = mountRowScroll(null);

      expect(() => row.scrollNext()).not.toThrow();
    });

    it('given no element, when updated, then nothing is thrown', () => {
      const row = mountRowScroll(null);

      expect(() => row.update()).not.toThrow();
    });
  });
});
