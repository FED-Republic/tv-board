import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import RowPages from '@/components/ui/RowPages.vue';
import { TEST_IDS } from '@/testing/test-ids';

const PAGE_COUNT = 4;
const THIRD_PAGE = 2;
/** More dots than a phone-width row can hold, so the count is written out instead. */
const CROWDED_PAGE_COUNT = 15;

const renderPages = (count: number, current = 0) =>
  render(RowPages, { props: { label: 'Drama', count, current } });

const group = (): HTMLElement => screen.getByRole('group', { name: 'Drama pages' });

const pageNames = (): readonly string[] =>
  within(group())
    .getAllByRole('button')
    .map((page) => page.getAttribute('aria-label') ?? '');

const pageAt = (page: number): HTMLElement =>
  screen.getByRole('button', { name: `Page ${page + 1} of ${PAGE_COUNT}` });

describe('RowPages', () => {
  describe('when the row holds at most one page', () => {
    it('given no page, when rendered, then nothing stands in for the dots', () => {
      renderPages(0);

      expect(screen.queryByRole('group')).toBeNull();
    });

    it('given a single page, when rendered, then nothing stands in for the dots', () => {
      renderPages(1);

      expect(screen.queryByRole('group')).toBeNull();
    });
  });

  describe('when the row holds several pages', () => {
    it('given the label Drama, when rendered, then the dots sit in a group named after the row', () => {
      renderPages(PAGE_COUNT);

      expect(group()).toBeDefined();
    });

    it('given four pages, when rendered, then each one is named by its position', () => {
      renderPages(PAGE_COUNT);

      expect(pageNames()).toEqual(['Page 1 of 4', 'Page 2 of 4', 'Page 3 of 4', 'Page 4 of 4']);
    });
  });

  describe('when a page is the current one', () => {
    it('given the third page as current, when rendered, then it is marked as current', () => {
      renderPages(PAGE_COUNT, THIRD_PAGE);

      expect(pageAt(THIRD_PAGE).getAttribute('aria-current')).toBe('page');
    });

    it('given the third page as current, when rendered, then the first is not marked', () => {
      renderPages(PAGE_COUNT, THIRD_PAGE);

      expect(pageAt(0).hasAttribute('aria-current')).toBe(false);
    });
  });

  describe('when the row holds more pages than dots fit', () => {
    it('given fifteen pages, when rendered, then the position is written out', () => {
      renderPages(CROWDED_PAGE_COUNT, THIRD_PAGE);

      expect(screen.getByTestId(TEST_IDS.rowPagesRange).textContent).toBe('Page 3 of 15');
    });

    it('given fifteen pages, when rendered, then no dots are drawn', () => {
      renderPages(CROWDED_PAGE_COUNT, THIRD_PAGE);

      expect(screen.queryByRole('group', { name: 'Drama pages' })).toBeNull();
    });
  });

  describe('when a page is chosen', () => {
    it('given four pages, when the third is clicked, then its index is selected once', async () => {
      const { emitted } = renderPages(PAGE_COUNT);

      await fireEvent.click(pageAt(THIRD_PAGE));

      expect(emitted()['select']).toEqual([[THIRD_PAGE]]);
    });

    it('given the third page as current, when its dot is clicked, then it is selected again', async () => {
      const { emitted } = renderPages(PAGE_COUNT, THIRD_PAGE);

      await fireEvent.click(pageAt(THIRD_PAGE));

      expect(emitted()['select']).toEqual([[THIRD_PAGE]]);
    });
  });
});
