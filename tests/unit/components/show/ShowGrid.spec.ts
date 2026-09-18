import { createTestingPinia } from '@pinia/testing';
import { render, screen, within } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { EAGER_POSTER_COUNT } from '@/components/show/eager-posters';
import ShowGrid from '@/components/show/ShowGrid.vue';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';
import { aShow, createComponentRouter } from '../builders';

const TWO_SHOWS: readonly Show[] = [
  aShow({ id: 169, name: 'Breaking Bad' }),
  aShow({ id: 82, name: 'Game of Thrones' }),
];

/** One more than the eager count, so the first below-the-fold poster is visible in the spec. */
const SEVEN_SHOWS: readonly Show[] = Array.from(
  { length: EAGER_POSTER_COUNT + 1 },
  (_unused, index) => aShow({ id: index + 1, name: `Show ${index + 1}` }),
);

let pinia: ReturnType<typeof createTestingPinia>;
let router: Router;

beforeEach(async () => {
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
  router = await createComponentRouter('/');
});

const renderGrid = (shows: readonly Show[], eager = false) =>
  render(ShowGrid, { props: { shows, eager }, global: { plugins: [pinia, router] } });

const posterLoadingModes = (): readonly string[] =>
  screen
    .getAllByTestId(TEST_IDS.showPosterImage)
    .map((image) => image.getAttribute('loading') ?? '');

describe('ShowGrid', () => {
  describe('when shows are listed', () => {
    it('given two shows, when rendered, then the grid is a list', () => {
      renderGrid(TWO_SHOWS);

      expect(screen.getByRole('list')).toBeDefined();
    });

    it('given two shows, when rendered, then each show is one list item', () => {
      renderGrid(TWO_SHOWS);

      expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
    });

    it('given two shows, when rendered, then every show is linked by name', () => {
      renderGrid(TWO_SHOWS);

      expect(screen.getByRole('link', { name: 'Game of Thrones, rated 9.3, 2008' })).toBeDefined();
    });
  });

  describe('when the grid is the first thing on the page', () => {
    it('given an eager grid, when rendered, then the posters above the fold load at once', () => {
      renderGrid(SEVEN_SHOWS, true);

      expect(posterLoadingModes().slice(0, EAGER_POSTER_COUNT)).toEqual(
        Array(EAGER_POSTER_COUNT).fill('eager'),
      );
    });

    it('given an eager grid, when rendered, then the poster below the fold stays lazy', () => {
      renderGrid(SEVEN_SHOWS, true);

      expect(posterLoadingModes().slice(EAGER_POSTER_COUNT)).toEqual(['lazy']);
    });
  });

  describe('when the grid is below the fold', () => {
    it('given no eager flag, when rendered, then no poster loads eagerly', () => {
      renderGrid(SEVEN_SHOWS);

      expect(posterLoadingModes()).toEqual(Array(SEVEN_SHOWS.length).fill('lazy'));
    });
  });

  describe('when there is nothing to list', () => {
    it('given no shows, when rendered, then the list stays empty', () => {
      renderGrid([]);

      expect(within(screen.getByRole('list')).queryAllByRole('listitem')).toHaveLength(0);
    });
  });
});
