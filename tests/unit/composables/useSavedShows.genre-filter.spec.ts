import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AsyncState } from '@/domain/async-state';
import type { Show, ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { useSavedShows } from '@/composables/useSavedShows';
import { useSavedStore } from '@/stores/saved';
import { useShowsStore } from '@/stores/shows';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

const UNDER_THE_DOME = toShowId(1);
const PERSON_OF_INTEREST = toShowId(2);
/** The one show of page 0 whose only genre is Music, which too few shows carry for a row. */
const THE_VOICE = toShowId(70);

type SavedShows = ReturnType<typeof useSavedShows>;

let pinia: TestingPinia;

const namesOf = (state: AsyncState<readonly Show[], Error>): readonly string[] =>
  state.status === 'success' ? state.data.map((show) => show.name) : [];

/** The bookmarked grid at `location`; the filter it reads comes from that location's `?genre=`. */
async function mountSavedShows(location: string): Promise<SavedShows> {
  const router = await createTestRouter(location);
  const { result } = withSetup(() => useSavedShows('bookmarks'), [pinia, router]);

  return result;
}

/** Page 0 of the captured index; it already holds ids 1, 2 and 70. */
const loadIndex = (): Promise<void> => useShowsStore().loadIndex();

const bookmark = (id: ShowId): void => useSavedStore().toggle('bookmarks', id);

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSavedShows', () => {
  describe('when the route filters by genre', () => {
    it('given ?genre=Drama, when resolved, then only Drama shows are listed', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      bookmark(PERSON_OF_INTEREST);

      const saved = await mountSavedShows('/bookmarked?genre=Drama');
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Under the Dome']);
    });

    it('given ?genre=Western, when resolved, then the list is empty', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);

      const saved = await mountSavedShows('/bookmarked?genre=Western');
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual([]);
    });
  });

  describe('when the saved show carries a genre too small for a dashboard row', () => {
    it('given a saved Music show, when ?genre=Music, then it is listed', async () => {
      await loadIndex();
      bookmark(THE_VOICE);

      const saved = await mountSavedShows('/bookmarked?genre=Music');
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['The Voice']);
    });

    it('given a saved Music show, when ?genre=Other, then it is left out', async () => {
      await loadIndex();
      bookmark(THE_VOICE);

      const saved = await mountSavedShows('/bookmarked?genre=Other');
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual([]);
    });
  });
});
