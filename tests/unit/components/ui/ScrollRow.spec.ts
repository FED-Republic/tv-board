import { fireEvent, screen, within } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { TEST_IDS } from '@/testing/test-ids';
import { giveRowOverflow, ITEMS, renderRow, ROW_WIDTH_PX, scroller } from './scroll-row-harness';

/** Well past the four pixels a drag needs before it swallows the click under the pointer. */
const DRAG_DISTANCE_PX = 60;

const forwardArrow = (): HTMLElement =>
  screen.getByRole('button', { name: 'Scroll Drama forward' });

const backArrow = (): HTMLElement => screen.getByRole('button', { name: 'Scroll Drama back' });

/** A mouse press, a move of `distancePx` to the left, and a release, as the browser sends them. */
function dragRow(row: HTMLElement, distancePx: number): void {
  row.dispatchEvent(
    new PointerEvent('pointerdown', { pointerType: 'mouse', button: 0, clientX: 0 }),
  );
  row.dispatchEvent(
    new PointerEvent('pointermove', { pointerType: 'mouse', clientX: -distancePx }),
  );
  row.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse' }));
}

/** Clicks the first card; `false` means the row swallowed the click. */
const clickCard = (): boolean =>
  screen
    .getByRole('link', { name: 'Breaking Bad' })
    .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

describe('ScrollRow', () => {
  describe('when the row is rendered', () => {
    it('given the label Drama, when rendered, then the scroller is named after the row', () => {
      renderRow();

      expect(scroller()).toBeDefined();
    });

    it('given a label, when rendered, then the scroller takes keyboard focus', () => {
      renderRow();

      expect(scroller().getAttribute('tabindex')).toBe('0');
    });

    it('given three items, when rendered, then each one is a list item', () => {
      renderRow();

      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    });

    it('given three items, when rendered, then the item slot renders each one', () => {
      renderRow();

      expect(screen.getByRole('link', { name: 'Breaking Bad' }).getAttribute('href')).toBe(
        '/shows/169',
      );
    });

    it('given a heading slot, when rendered, then the heading is shown', () => {
      renderRow();

      expect(screen.getByRole('heading', { name: 'Drama' })).toBeDefined();
    });
  });

  describe('when the row sits at its start', () => {
    it('given no scrolling yet, when rendered, then scrolling back is unavailable', () => {
      renderRow();

      expect(backArrow().hasAttribute('disabled')).toBe(true);
    });

    it('given a row that does not overflow, when rendered, then scrolling on is unavailable', () => {
      renderRow();

      expect(forwardArrow().hasAttribute('disabled')).toBe(true);
    });
  });

  describe('when the content overflows the row', () => {
    it('given content wider than the row, when it is measured, then scrolling on is offered', async () => {
      renderRow();
      giveRowOverflow(scroller());

      await fireEvent.scroll(scroller());

      expect(forwardArrow().hasAttribute('disabled')).toBe(false);
    });

    it('given a row still at its start, when it is measured, then scrolling back stays off', async () => {
      renderRow();
      giveRowOverflow(scroller());

      await fireEvent.scroll(scroller());

      expect(backArrow().hasAttribute('disabled')).toBe(true);
    });
  });

  describe('when more shows are still arriving', () => {
    it('given a filling row, when rendered, then a spinner closes the row', () => {
      renderRow(true);

      expect(screen.queryByTestId(TEST_IDS.scrollRowLoading)).not.toBeNull();
    });

    it('given a filling row, when rendered, then the spinner tile is hidden from assistive tech', () => {
      renderRow(true);

      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(ITEMS.length);
    });

    it('given a filling row, when rendered, then nothing announces the loading twice', () => {
      renderRow(true);

      expect(screen.queryByRole('status')).toBeNull();
    });

    it('given a settled row, when rendered, then no spinner is shown', () => {
      renderRow();

      expect(screen.queryByTestId(TEST_IDS.scrollRowLoading)).toBeNull();
    });
  });

  describe('when the row is scrolled by its arrows', () => {
    it('given an overflowing row, when the forward arrow is pressed, then the row scrolls one viewport on', async () => {
      renderRow();
      const row = scroller();
      giveRowOverflow(row);
      const scrollBy = vi.spyOn(row, 'scrollBy');
      await fireEvent.scroll(row);

      await fireEvent.click(forwardArrow());

      expect(scrollBy).toHaveBeenCalledWith({ left: ROW_WIDTH_PX, behavior: 'smooth' });
    });
  });

  describe('when the row is dragged with a mouse', () => {
    it('given a drag past the threshold, when the click follows, then it is swallowed', () => {
      renderRow();
      const row = scroller();
      dragRow(row, DRAG_DISTANCE_PX);

      const wasDelivered = clickCard();

      expect(wasDelivered).toBe(false);
    });
  });

  describe('when the row is used from the keyboard', () => {
    it('given focus on the row, when ArrowRight is pressed, then the first card takes focus', async () => {
      renderRow();

      await fireEvent.keyDown(scroller(), { key: 'ArrowRight' });

      expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Breaking Bad' }));
    });
  });
});
