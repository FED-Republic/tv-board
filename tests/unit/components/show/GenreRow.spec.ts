import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { EAGER_POSTER_COUNT } from '@/components/show/eager-posters';
import GenreRow from '@/components/show/GenreRow.vue';
import type { GenreRow as GenreRowModel } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';
import { aShow, createComponentRouter } from '../builders';

const SHOW_COUNT = 8;
const HALF_LOADED = 0.5;
const EXPAND_LABEL = 'Show the Drama row as a grid';
/** jsdom lays nothing out, so where the heading sits is stated by hand: the viewport is 768 px. */
const ON_SCREEN = new DOMRect(0, 100, 300, 200);
const ABOVE_THE_VIEWPORT = new DOMRect(0, -400, 300, 200);

let pinia: TestingPinia;
let router: Router;

const eightShows = (): readonly Show[] =>
  Array.from({ length: SHOW_COUNT }, (_unused, index) =>
    aShow({ id: index + 1, name: `Show ${index + 1}` }),
  );

const dramaRow: GenreRowModel = { genre: 'Drama', shows: eightShows(), total: SHOW_COUNT };

const renderRow = (eager = false, filling = false) =>
  render(GenreRow, {
    props: { row: dramaRow, progress: HALF_LOADED, eager, filling },
    global: { plugins: [pinia, router] },
  });

/**
 * The row the reader just came back to from its grid. Testing Library unwraps its container
 * right after mounting, which blurs whatever `onMounted` focused, so this one mounts into the
 * body itself.
 */
const mountRevealedRow = (): void => {
  mount(GenreRow, {
    props: { row: dramaRow, progress: HALF_LOADED, reveal: true },
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
};

/** A row that has been on the page all along, as the rows behind an open grid are. */
const mountHiddenRow = (): VueWrapper =>
  mount(GenreRow, {
    props: { row: dramaRow, progress: HALF_LOADED, reveal: false },
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });

const placeHeadingAt = (rect: DOMRect): void =>
  void vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);

const section = (): HTMLElement => screen.getByTestId(TEST_IDS.genreRow);

const heading = (): HTMLElement => screen.getByRole('heading', { level: 2, name: 'Drama' });

const expandButton = (): HTMLElement => screen.getByRole('button', { name: EXPAND_LABEL });

const posterLoadingModes = (): readonly string[] =>
  screen
    .getAllByTestId(TEST_IDS.showPosterImage)
    .map((image) => image.getAttribute('loading') ?? '');

enableAutoUnmount(afterEach);

beforeEach(async () => {
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
  router = await createComponentRouter('/');
});

describe('GenreRow', () => {
  describe('when the row is rendered', () => {
    it('given a Drama row, when rendered, then the section is the region named by its heading', () => {
      renderRow();

      expect(screen.getByRole('region', { name: 'Drama' })).toBe(section());
    });

    it('given a Drama row, when rendered, then the scroller inside keeps its own name', () => {
      renderRow();

      expect(screen.getByRole('group', { name: 'Drama row' })).toBeDefined();
    });

    it('given a Drama row, when rendered, then the section is tagged with its genre', () => {
      renderRow();

      expect(section().dataset['genre']).toBe('Drama');
    });

    it('given eight shows, when rendered, then each one gets a tile', () => {
      renderRow();

      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(SHOW_COUNT);
    });

    it('given eight shows, when rendered, then every card carries its show id', () => {
      renderRow();

      expect(screen.getAllByTestId(TEST_IDS.showCard)[0]?.dataset['showId']).toBe('1');
    });
  });

  describe('when the index is still loading', () => {
    it('given a progress value, when rendered, then the progress bar is decoration only', () => {
      renderRow();

      expect(screen.getByTestId(TEST_IDS.genreRowProgress).getAttribute('aria-hidden')).toBe(
        'true',
      );
    });
  });

  describe('when the row is the first on the page', () => {
    it('given an eager row, when rendered, then the posters above the fold load at once', () => {
      renderRow(true);

      expect(posterLoadingModes().slice(0, EAGER_POSTER_COUNT)).toEqual(
        Array(EAGER_POSTER_COUNT).fill('eager'),
      );
    });

    it('given an eager row, when rendered, then the posters below the fold stay lazy', () => {
      renderRow(true);

      expect(posterLoadingModes().slice(EAGER_POSTER_COUNT)).toEqual(['lazy', 'lazy']);
    });
  });

  describe('when the row is below the first', () => {
    it('given a lazy row, when rendered, then no poster loads eagerly', () => {
      renderRow();

      expect(posterLoadingModes()).toEqual(Array(SHOW_COUNT).fill('lazy'));
    });
  });

  describe('when the reader asks for the whole genre', () => {
    it('given a Drama row, when rendered, then the expand button names the genre and the grid', () => {
      renderRow();

      expect(expandButton()).toBeDefined();
    });

    it('given a Drama row, when the expand button is clicked, then expand is emitted once', async () => {
      const { emitted } = renderRow();

      await fireEvent.click(expandButton());

      expect(emitted()['expand']).toHaveLength(1);
    });
  });

  describe('when the row is the one the reader came back to', () => {
    it('given reveal, when mounted, then the heading takes focus', () => {
      placeHeadingAt(ON_SCREEN);

      mountRevealedRow();

      expect(document.activeElement).toBe(heading());
    });

    it('given reveal, when mounted, then the heading is focusable without being a tab stop', () => {
      placeHeadingAt(ON_SCREEN);

      mountRevealedRow();

      expect(heading().getAttribute('tabindex')).toBe('-1');
    });

    it('given a heading on screen, when the row is revealed, then the row stays where it is', () => {
      placeHeadingAt(ON_SCREEN);
      const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

      mountRevealedRow();

      expect(scrollIntoView.mock.instances).not.toContain(section());
    });

    it('given a heading above the viewport, when the row is revealed, then the row scrolls itself into view', () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

      mountRevealedRow();

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    });

    it('given no reveal, when mounted, then focus stays where the reader left it', () => {
      renderRow();

      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('when the row behind the grid becomes the one the reader came back to', () => {
    it('given a row already mounted, when it is revealed, then its heading takes focus', async () => {
      placeHeadingAt(ON_SCREEN);
      const row = mountHiddenRow();

      await row.setProps({ reveal: true });

      expect(document.activeElement).toBe(heading());
    });

    it('given a row already on screen, when it is revealed, then it does not scroll itself', async () => {
      placeHeadingAt(ON_SCREEN);
      const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
      const row = mountHiddenRow();

      await row.setProps({ reveal: true });

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('given a row above the viewport, when it is revealed, then it scrolls itself into view', async () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
      const row = mountHiddenRow();

      await row.setProps({ reveal: true });

      expect(scrollIntoView.mock.instances).toContain(section());
    });

    it('given a row already mounted, when it is revealed, then the page is not scrolled', async () => {
      placeHeadingAt(ABOVE_THE_VIEWPORT);
      const scrollTo = vi.spyOn(window, 'scrollTo');
      const row = mountHiddenRow();

      await row.setProps({ reveal: true });

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
