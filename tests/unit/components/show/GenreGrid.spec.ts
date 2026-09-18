import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { EAGER_POSTER_COUNT } from '@/components/show/eager-posters';
import GenreGrid from '@/components/show/GenreGrid.vue';
import type { Genre } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';
import { aShow, createComponentRouter } from '../builders';

/** One more than the eager count, so the first below-the-fold poster is visible in the spec. */
const SHOW_COUNT = EAGER_POSTER_COUNT + 1;
const GENRE: Genre = 'Drama';
const CLOSE_LABEL = 'Close Drama grid';

let pinia: TestingPinia;
let router: Router;

const sevenShows = (): readonly Show[] =>
  Array.from({ length: SHOW_COUNT }, (_unused, index) =>
    aShow({ id: index + 1, name: `Show ${index + 1}` }),
  );

const renderGrid = () =>
  render(GenreGrid, {
    props: { genre: GENRE, shows: sevenShows() },
    global: { plugins: [pinia, router] },
  });

const countLine = (): string => screen.getByTestId(TEST_IDS.genreGridCount).textContent ?? '';

/**
 * The grid the reader just opened. Testing Library unwraps its container right after mounting,
 * which blurs whatever `onMounted` focused, so this one mounts into the body itself.
 */
const mountRevealedGrid = (): void => {
  mount(GenreGrid, {
    props: { genre: GENRE, shows: sevenShows(), reveal: true },
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
};

const section = (): HTMLElement => screen.getByTestId(TEST_IDS.genreGrid);

const heading = (): HTMLElement => screen.getByRole('heading', { level: 2, name: GENRE });

const closeButton = (): HTMLElement => screen.getByRole('button', { name: CLOSE_LABEL });

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

describe('GenreGrid', () => {
  describe('when the grid is rendered', () => {
    it('given Drama shows, when rendered, then the section is the region named by its heading', () => {
      renderGrid();

      expect(screen.getByRole('region', { name: GENRE })).toBe(section());
    });

    it('given Drama shows, when rendered, then the heading names the genre', () => {
      renderGrid();

      expect(heading()).toBeDefined();
    });

    it('given Drama shows, when rendered, then the section is tagged with its genre', () => {
      renderGrid();

      expect(section().dataset['genre']).toBe(GENRE);
    });

    it('given seven shows, when rendered, then each one is one list item', () => {
      renderGrid();

      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(SHOW_COUNT);
    });
  });

  describe('when the grid says how much it holds', () => {
    it('given seven shows, when rendered, then the count is plain', () => {
      renderGrid();

      expect(countLine()).toBe('7 shows');
    });

    it('given a grid a press can widen, when rendered, then the count line is the live region', () => {
      renderGrid();

      expect(screen.getByRole('status')).toBe(screen.getByTestId(TEST_IDS.genreGridCount));
    });
  });

  describe('when the grid opens above the fold', () => {
    it('given a grid, when rendered, then the posters above the fold load at once', () => {
      renderGrid();

      expect(posterLoadingModes().slice(0, EAGER_POSTER_COUNT)).toEqual(
        Array(EAGER_POSTER_COUNT).fill('eager'),
      );
    });

    it('given a grid, when rendered, then the poster below the fold stays lazy', () => {
      renderGrid();

      expect(posterLoadingModes().slice(EAGER_POSTER_COUNT)).toEqual(['lazy']);
    });
  });

  describe('when the reader leaves the grid', () => {
    it('given a Drama grid, when rendered, then the close button names the grid', () => {
      renderGrid();

      expect(closeButton()).toBeDefined();
    });

    it('given a Drama grid, when the close button is clicked, then close is emitted once', async () => {
      const { emitted } = renderGrid();

      await fireEvent.click(closeButton());

      expect(emitted()['close']).toHaveLength(1);
    });
  });

  describe('when the grid is the one the reader just asked for', () => {
    it('given reveal, when mounted, then the heading takes focus', () => {
      mountRevealedGrid();

      expect(document.activeElement).toBe(heading());
    });

    it('given reveal, when mounted, then the heading is focusable without being a tab stop', () => {
      mountRevealedGrid();

      expect(heading().getAttribute('tabindex')).toBe('-1');
    });

    it('given reveal, when mounted, then the section is scrolled into view', () => {
      const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

      mountRevealedGrid();

      expect(scrollIntoView.mock.instances[0]).toBe(section());
    });

    it('given no reveal, when mounted, then focus stays where the reader left it', () => {
      renderGrid();

      expect(document.activeElement).toBe(document.body);
    });
  });
});
