import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, type Ref, ref } from 'vue';
import { useFrozenGenreLayout } from '@/composables/useFrozenGenreLayout';
import { type Genre, OTHER_GENRE } from '@/domain/genre';
import { useShowsStore } from '@/stores/shows';
import { withSetup } from './with-setup';

type ShowsStore = ReturnType<typeof useShowsStore>;
type Harness = {
  readonly store: ShowsStore;
  readonly genre: Ref<Genre | null>;
  readonly unmount: () => void;
};

let pinia: TestingPinia;

/** Every state the composable has asked the store for, in order; `true` is a freeze. */
const freezeStates = (store: ShowsStore): readonly boolean[] =>
  vi.mocked(store.setGenreLayoutFrozen).mock.calls.map(([isFrozen]) => isFrozen);

const freezeCount = (store: ShowsStore): number =>
  freezeStates(store).filter((isFrozen) => isFrozen).length;

/** The composable watching the genre a dashboard grid is open on; `null` means the rows. */
function mountFrozenLayout(openGrid: Genre | null): Harness {
  const genre = ref<Genre | null>(openGrid);
  // The composable returns nothing, so the host hands back the store it drives instead.
  const { result, unmount } = withSetup(() => {
    useFrozenGenreLayout(genre);

    return useShowsStore();
  }, [pinia]);

  return { store: result, genre, unmount };
}

beforeEach(() => {
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

describe('useFrozenGenreLayout', () => {
  describe('when the Other grid is open', () => {
    it('given Other at setup, when the composable runs, then the layout is frozen once', () => {
      const { store } = mountFrozenLayout(OTHER_GENRE);

      expect(freezeStates(store)).toEqual([true]);
    });

    it('given Other at setup, when the composable runs, then the layout is not released', () => {
      const { store } = mountFrozenLayout(OTHER_GENRE);

      expect(freezeStates(store)).not.toContain(false);
    });
  });

  describe('when the Other grid closes', () => {
    it('given the Other grid, when the genre clears, then the layout is released', async () => {
      const { store, genre } = mountFrozenLayout(OTHER_GENRE);

      genre.value = null;
      await nextTick();

      expect(freezeStates(store)).toEqual([true, false]);
    });

    it('given the Other grid, when another genre opens, then the layout is released', async () => {
      const { store, genre } = mountFrozenLayout(OTHER_GENRE);

      genre.value = 'Drama';
      await nextTick();

      expect(freezeStates(store)).toEqual([true, false]);
    });

    it('given the Other grid, when another genre opens, then nothing is frozen again', async () => {
      const { store, genre } = mountFrozenLayout(OTHER_GENRE);

      genre.value = 'Drama';
      await nextTick();

      expect(freezeCount(store)).toBe(1);
    });
  });

  describe('when another grid is open', () => {
    it('given Drama at setup, when the composable runs, then the layout is never frozen', () => {
      const { store } = mountFrozenLayout('Drama');

      expect(freezeStates(store)).not.toContain(true);
    });

    it('given Drama at setup, when Other opens, then the layout is frozen', async () => {
      const { store, genre } = mountFrozenLayout('Drama');

      genre.value = OTHER_GENRE;
      await nextTick();

      expect(freezeStates(store)).toEqual([false, true]);
    });
  });

  describe('when the page goes while the grid is open', () => {
    it('given the Other grid, when the scope is disposed, then the layout is released', () => {
      const { store, unmount } = mountFrozenLayout(OTHER_GENRE);

      unmount();

      expect(freezeStates(store)).toEqual([true, false]);
    });

    it('given the rows, when the scope is disposed, then nothing was ever frozen', () => {
      const { store, unmount } = mountFrozenLayout(null);

      unmount();

      expect(freezeStates(store)).not.toContain(true);
    });
  });
});
