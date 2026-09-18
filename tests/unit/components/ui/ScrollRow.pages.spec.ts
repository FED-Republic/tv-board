import { fireEvent, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  CONTENT_WIDTH_WITHOUT_SPINNER_PX,
  GROWN_ITEMS,
  giveRowOverflow,
  measureOverflowingRow,
  PAGE_COUNT,
  PAGE_COUNT_WITHOUT_SPINNER,
  renderFillingRow,
  renderGrowableRow,
  renderRow,
  renderRowWithTools,
  ROW_WIDTH_PX,
  scroller,
} from './scroll-row-harness';

const THIRD_PAGE = 2;
const THIRD_PAGE_OFFSET_PX = THIRD_PAGE * ROW_WIDTH_PX;
const EXPAND_LABEL = 'Show the Drama row as a grid';

/** The arrow is disabled until the row is measured, and a disabled button still has its role. */
const nextArrow = (): HTMLElement => screen.getByRole('button', { name: 'Scroll Drama forward' });

const isAfter = (node: Node, other: Node): boolean =>
  (other.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

const pages = (): HTMLElement => screen.getByRole('group', { name: 'Drama pages' });

const pageNames = (): readonly string[] =>
  within(pages())
    .getAllByRole('button')
    .map((page) => page.getAttribute('aria-label') ?? '');

const pageAt = (page: number): HTMLElement =>
  screen.getByRole('button', { name: `Page ${page + 1} of ${PAGE_COUNT}` });

describe('ScrollRow', () => {
  describe('when the row is paged by its dots', () => {
    it('given four viewports of cards, when the row is measured, then one page per viewport is named', async () => {
      renderRow();

      await measureOverflowingRow();

      expect(pageNames()).toEqual(['Page 1 of 4', 'Page 2 of 4', 'Page 3 of 4', 'Page 4 of 4']);
    });

    it('given a measured row, when it is scrolled two viewports on, then the third page becomes current', async () => {
      renderRow();
      const row = await measureOverflowingRow();

      row.scrollLeft = THIRD_PAGE_OFFSET_PX;
      await fireEvent.scroll(row);

      expect(pageAt(THIRD_PAGE).getAttribute('aria-current')).toBe('page');
    });

    it('given four pages, when the third one is clicked, then the row scrolls to it', async () => {
      renderRow();
      const row = await measureOverflowingRow();
      const scrollTo = vi.spyOn(row, 'scrollTo');

      await fireEvent.click(pageAt(THIRD_PAGE));

      expect(scrollTo).toHaveBeenCalledWith({
        left: THIRD_PAGE_OFFSET_PX,
        behavior: 'smooth',
      });
    });
  });

  describe('when the row grows', () => {
    it('given a row with metrics, when more items arrive, then the row is measured again', async () => {
      const { rerender } = renderGrowableRow();
      giveRowOverflow(scroller());

      await rerender({ items: GROWN_ITEMS });
      await nextTick();

      expect(pageNames()).toHaveLength(PAGE_COUNT);
    });
  });

  describe('when the row stops filling', () => {
    it('given a measured filling row, when its loading tile leaves, then the pages are counted again', async () => {
      const { rerender } = renderFillingRow();
      await measureOverflowingRow();

      giveRowOverflow(scroller(), CONTENT_WIDTH_WITHOUT_SPINNER_PX);
      await rerender({ filling: false });
      // The row measures itself a tick after the list re-renders, so one `nextTick` is too early.
      await flushPromises();

      expect(pageNames()).toHaveLength(PAGE_COUNT_WITHOUT_SPINNER);
    });
  });

  describe('when the row carries tools', () => {
    it('given a tools slot, when rendered, then its control sits beside the heading', () => {
      renderRowWithTools(EXPAND_LABEL);

      expect(screen.getByRole('button', { name: EXPAND_LABEL })).toBeDefined();
    });

    it('given a tools slot, when rendered, then its control comes after the next arrow', () => {
      renderRowWithTools(EXPAND_LABEL);

      const expandButton = screen.getByRole('button', { name: EXPAND_LABEL });

      expect(isAfter(expandButton, nextArrow())).toBe(true);
    });
  });
});
