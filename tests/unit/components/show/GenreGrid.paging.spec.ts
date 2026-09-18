import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import GenreGrid from '@/components/show/GenreGrid.vue';
import { LOADED_WHOLE_INDEX_TEXT } from '@/domain/dashboard-copy';
import { type Genre, GRID_PAGE_SIZE } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';
import { aShow, createComponentRouter } from '../builders';

const GENRE: Genre = 'Drama';
const SHOW_MORE_LABEL = 'Show more Drama shows';
const LOAD_MORE_LABEL = 'Load more shows from TVmaze';
/** One grid page and a few shows more, so a single press reaches the end of what is loaded. */
const OVERFULL_COUNT = GRID_PAGE_SIZE + 5;
/** Two full pages and a short third, so two presses each move by one page. */
const CROWDED_COUNT = 2 * GRID_PAGE_SIZE + 10;
/** Fewer than one page, so the grid holds the whole genre from the start. */
const SMALL_COUNT = 7;
/** Exactly one page: every loaded show is on screen and the next press asks TVmaze. */
const BOUNDARY_COUNT = GRID_PAGE_SIZE;
/** What the genre holds once the page a reader asked for has landed. */
const WIDENED_COUNT = GRID_PAGE_SIZE + 15;
/** A page that brings four grid pages at once, so presses stacked into headroom would show. */
const FLOODED_COUNT = 4 * GRID_PAGE_SIZE;

type GridProps = {
  shows: readonly Show[];
  isLoadingMore?: boolean;
  hasMorePages?: boolean;
  onLoadMore?: () => void;
};

let pinia: TestingPinia;
let router: Router;

const showsOf = (count: number): readonly Show[] =>
  Array.from({ length: count }, (_unused, index) =>
    aShow({ id: index + 1, name: `Show ${index + 1}` }),
  );

const renderGrid = (props: GridProps) =>
  render(GenreGrid, { props: { genre: GENRE, ...props }, global: { plugins: [pinia, router] } });

type Grid = ReturnType<typeof renderGrid>;

/** A store that takes the press the way `loadMore` does: the page starts before the next tick. */
function renderGridTakingPresses(props: GridProps): Grid {
  const grid: Grid = renderGrid({
    ...props,
    onLoadMore: () => void grid.rerender({ isLoadingMore: true }),
  });

  return grid;
}

const cardCount = (): number => within(screen.getByRole('list')).getAllByRole('listitem').length;

const countLine = (): string => screen.getByTestId(TEST_IDS.genreGridCount).textContent ?? '';

const moreButton = (name: string): HTMLElement => screen.getByRole('button', { name });

/** A press and the tick the control waits on before it knows whether the store took it. */
async function pressMore(name: string): Promise<void> {
  await fireEvent.click(moreButton(name));
  await flushPromises();
}

beforeEach(async () => {
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
  router = await createComponentRouter('/');
});

describe('GenreGrid', () => {
  describe('when the genre holds more shows than one page renders', () => {
    it('given thirty loaded shows, when rendered, then one page of cards is on screen', () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      expect(cardCount()).toBe(GRID_PAGE_SIZE);
    });

    it('given thirty loaded shows, when rendered, then the count says what is on screen', () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      expect(countLine()).toBe('Top 25 of 30 loaded shows');
    });

    it('given thirty loaded shows, when rendered, then the button offers the loaded shows', () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      expect(moreButton(SHOW_MORE_LABEL)).toBeDefined();
    });
  });

  describe('when the reader asks for more of the loaded shows', () => {
    it('given thirty loaded shows, when Show more is pressed, then every one is on screen', async () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      await pressMore(SHOW_MORE_LABEL);

      expect(cardCount()).toBe(OVERFULL_COUNT);
    });

    it('given thirty loaded shows, when Show more is pressed, then the count is plain', async () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      await pressMore(SHOW_MORE_LABEL);

      expect(countLine()).toBe('30 shows');
    });

    it('given thirty loaded shows, when Show more is pressed, then no page is asked for', async () => {
      const { emitted } = renderGrid({ shows: showsOf(OVERFULL_COUNT), hasMorePages: true });

      await pressMore(SHOW_MORE_LABEL);

      expect(emitted()['loadMore']).toBeUndefined();
    });

    it('given pages left at TVmaze, when the last loaded show is on screen, then the button asks for one', async () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT), hasMorePages: true });

      await pressMore(SHOW_MORE_LABEL);

      expect(moreButton(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given sixty loaded shows, when Show more is pressed once, then one page more is on screen', async () => {
      renderGrid({ shows: showsOf(CROWDED_COUNT) });

      await pressMore(SHOW_MORE_LABEL);

      expect(cardCount()).toBe(2 * GRID_PAGE_SIZE);
    });

    it('given sixty loaded shows, when Show more is pressed twice, then the rest is on screen', async () => {
      renderGrid({ shows: showsOf(CROWDED_COUNT) });

      await pressMore(SHOW_MORE_LABEL);
      await pressMore(SHOW_MORE_LABEL);

      expect(cardCount()).toBe(CROWDED_COUNT);
    });
  });

  describe('when the grid already holds every loaded show of its genre', () => {
    it('given pages left at TVmaze, when rendered, then the button asks TVmaze for one', () => {
      renderGrid({ shows: showsOf(SMALL_COUNT), hasMorePages: true });

      expect(moreButton(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given pages left at TVmaze, when the button is pressed, then loadMore is emitted once', async () => {
      const { emitted } = renderGrid({ shows: showsOf(SMALL_COUNT), hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(emitted()['loadMore']).toHaveLength(1);
    });

    it('given pages left at TVmaze, when rendered, then the QA hook is on the button itself', () => {
      renderGrid({ shows: showsOf(SMALL_COUNT), hasMorePages: true });

      expect(screen.getByTestId(TEST_IDS.moreShowsButton)).toBe(moreButton(LOAD_MORE_LABEL));
    });

    it('given no page left at TVmaze, when rendered, then there is no more-shows button', () => {
      renderGrid({ shows: showsOf(SMALL_COUNT) });

      expect(screen.queryByTestId(TEST_IDS.moreShowsButton)).toBeNull();
    });

    it('given no page left at TVmaze, when rendered, then the note says the whole index is loaded', () => {
      renderGrid({ shows: showsOf(SMALL_COUNT) });

      expect(screen.getByTestId(TEST_IDS.moreShowsEnd).textContent?.trim()).toBe(
        LOADED_WHOLE_INDEX_TEXT,
      );
    });
  });

  describe('when the grid sits exactly on a page boundary', () => {
    it('given twenty-five loaded shows, when rendered, then the button asks TVmaze for a page', () => {
      renderGrid({ shows: showsOf(BOUNDARY_COUNT), hasMorePages: true });

      expect(moreButton(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given twenty-five loaded shows, when Load more is pressed, then loadMore is emitted once', async () => {
      const { emitted } = renderGrid({ shows: showsOf(BOUNDARY_COUNT), hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(emitted()['loadMore']).toHaveLength(1);
    });

    it('given a press on the boundary, when the page brings more shows, then they render at once', async () => {
      const { rerender } = renderGrid({ shows: showsOf(BOUNDARY_COUNT), hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);
      await rerender({ shows: showsOf(WIDENED_COUNT) });

      expect(cardCount()).toBe(WIDENED_COUNT);
    });
  });

  describe('when a page is on its way', () => {
    it('given a press the store took, when the page is in flight, then the button reports the wait', async () => {
      renderGridTakingPresses({ shows: showsOf(SMALL_COUNT), hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(moreButton(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('true');
    });

    it('given a press the store took, when the page is in flight, then the button stays clickable', async () => {
      renderGridTakingPresses({ shows: showsOf(SMALL_COUNT), hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(moreButton(LOAD_MORE_LABEL).hasAttribute('disabled')).toBe(false);
    });

    it('given a one-page genre, when the background loop is running, then the button is not waiting', () => {
      renderGrid({ shows: showsOf(SMALL_COUNT), hasMorePages: true, isLoadingMore: true });

      expect(moreButton(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });

    it('given loaded shows left to render, when a page is in flight, then the button is not waiting', () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT), hasMorePages: true, isLoadingMore: true });

      expect(moreButton(SHOW_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('when the reader presses again while a page is on its way', () => {
    it('given a second press the store drops, when the page lands, then one page more is on screen', async () => {
      const { rerender } = renderGrid({ shows: showsOf(BOUNDARY_COUNT), hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);
      await pressMore(LOAD_MORE_LABEL);

      await rerender({ shows: showsOf(FLOODED_COUNT) });

      expect(cardCount()).toBe(2 * GRID_PAGE_SIZE);
    });

    it('given a grid one page ahead, when the reader presses after the page landed, then one page more joins', async () => {
      const { rerender } = renderGrid({ shows: showsOf(BOUNDARY_COUNT), hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);
      await pressMore(LOAD_MORE_LABEL);
      await rerender({ shows: showsOf(FLOODED_COUNT) });

      await pressMore(SHOW_MORE_LABEL);

      expect(cardCount()).toBe(3 * GRID_PAGE_SIZE);
    });
  });

  describe('when the count line answers a press', () => {
    it('given thirty loaded shows, when Show more renders the rest, then the count line reads anew', async () => {
      renderGrid({ shows: showsOf(OVERFULL_COUNT) });
      const countBeforeThePress = countLine();

      await pressMore(SHOW_MORE_LABEL);

      expect(countLine()).not.toBe(countBeforeThePress);
    });

    // The gap `DECISIONS.md` records: the line is the only answer, so nothing new means silence.
    it('given a page that brings the genre nothing, when Load more is pressed, then the count line is unchanged', async () => {
      const { rerender } = renderGrid({ shows: showsOf(SMALL_COUNT), hasMorePages: true });
      const countBeforeThePress = countLine();

      await pressMore(LOAD_MORE_LABEL);
      await rerender({ shows: showsOf(SMALL_COUNT) });

      expect(countLine()).toBe(countBeforeThePress);
    });
  });

  describe('when a page widens the genre under the grid', () => {
    it('given a grid on its first page, when more shows arrive, then the page on screen is unchanged', async () => {
      const { rerender } = renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      await rerender({ shows: showsOf(CROWDED_COUNT) });

      expect(cardCount()).toBe(GRID_PAGE_SIZE);
    });

    it('given a grid on its first page, when more shows arrive, then the button still offers them', async () => {
      const { rerender } = renderGrid({ shows: showsOf(OVERFULL_COUNT) });

      await rerender({ shows: showsOf(CROWDED_COUNT) });

      expect(moreButton(SHOW_MORE_LABEL)).toBeDefined();
    });
  });
});
