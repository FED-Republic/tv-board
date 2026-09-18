import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import type { SavedKind } from '@/domain/saved';
import type { ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import SavedShowsPage from '@/pages/SavedShowsPage.vue';
import { createAppRouter } from '@/router';
import { useSavedStore } from '@/stores/saved';
import { useShowsStore } from '@/stores/shows';
import { TEST_IDS } from '@/testing/test-ids';

const BACKGROUND_WINDOW_MS = 10_000;
const UNDER_THE_DOME = toShowId(1);
const PERSON_OF_INTEREST = toShowId(2);
const BREAKING_BAD = toShowId(169);

let pinia: TestingPinia;

/** Page 0 of the captured index; it already holds ids 1, 2 and 169. */
const loadIndex = (): Promise<void> => useShowsStore().loadIndex();

const bookmark = (id: ShowId): void => useSavedStore().toggle('bookmarks', id);

const like = (id: ShowId): void => useSavedStore().toggle('likes', id);

async function renderSavedShows(kind: SavedKind, location = '/bookmarked'): Promise<void> {
  const router = createAppRouter(createMemoryHistory());

  await router.push(location);
  await router.isReady();
  render(SavedShowsPage, { props: { kind }, global: { plugins: [pinia, router] } });
}

const page = (): HTMLElement => screen.getByTestId(TEST_IDS.savedShowsPage);

/** The count is announced, so its live region is in the page before a number appears in it. */
const liveCount = (): Element | null => page().querySelector('[aria-live="polite"]');

/** A card link is named by its own content, so its collapsed text is its accessible name. */
const cardNames = (): readonly string[] =>
  within(screen.getByTestId(TEST_IDS.savedShowsGrid))
    .getAllByRole('link')
    .map((link) => link.textContent?.replace(/\s+/g, ' ').trim() ?? '');

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('SavedShowsPage', () => {
  describe('when nothing is bookmarked', () => {
    it('given no bookmarks, when the page mounts, then the root reports empty', async () => {
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(page().dataset['state']).toBe('empty');
    });

    it('given no bookmarks, when the page mounts, then the root names its kind', async () => {
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(page().dataset['kind']).toBe('bookmarks');
    });

    it('given no bookmarks, when the page mounts, then Bookmarked is the heading', async () => {
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bookmarked');
    });

    it('given no bookmarks, when the page mounts, then the empty state says so', async () => {
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Nothing bookmarked yet.');
    });

    it('given no bookmarks, when the page mounts, then the count region is already there', async () => {
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(liveCount()).not.toBeNull();
    });

    it('given no bookmarks, when the page mounts, then browsing genres is offered', async () => {
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(screen.getByRole('link', { name: 'Browse genres' }).getAttribute('href')).toBe('/');
    });
  });

  describe('when the bookmarked shows are in the index', () => {
    it('given two bookmarks, when the page mounts, then both are listed rated first', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      bookmark(PERSON_OF_INTEREST);

      await renderSavedShows('bookmarks');
      await flushPromises();

      expect(cardNames()).toEqual([
        'Person of Interest, rated 8.8, 2011',
        'Under the Dome, rated 6.6, 2013',
      ]);
    });

    it('given two bookmarks, when the page mounts, then the count names the total', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      bookmark(PERSON_OF_INTEREST);

      await renderSavedShows('bookmarks');
      await flushPromises();

      expect(liveCount()?.textContent?.trim()).toBe('2 shows');
    });
  });

  describe('when a bookmarked show is missing from the index', () => {
    it('given an unindexed bookmark, when the request is in flight, then the root reports loading', async () => {
      bookmark(BREAKING_BAD);

      await renderSavedShows('bookmarks');

      expect(page().dataset['state']).toBe('loading');
    });

    it('given an unindexed bookmark, when the request lands, then the root reports success', async () => {
      bookmark(BREAKING_BAD);
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(page().dataset['state']).toBe('success');
    });

    it('given an unindexed bookmark, when the request lands, then the show is listed', async () => {
      bookmark(BREAKING_BAD);
      await renderSavedShows('bookmarks');

      await flushPromises();

      expect(cardNames()).toEqual(['Breaking Bad, rated 9.2, 2008']);
    });
  });

  describe('when the page shows liked shows', () => {
    it('given no likes, when the page mounts, then Liked is the heading', async () => {
      await renderSavedShows('likes', '/liked');

      await flushPromises();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Liked');
    });

    it('given no likes, when the page mounts, then the empty state says so', async () => {
      await renderSavedShows('likes', '/liked');

      await flushPromises();

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Nothing liked yet.');
    });

    it('given one like, when the page mounts, then the liked show is listed', async () => {
      await loadIndex();
      like(PERSON_OF_INTEREST);

      await renderSavedShows('likes', '/liked');
      await flushPromises();

      expect(cardNames()).toEqual(['Person of Interest, rated 8.8, 2011']);
    });
  });

  describe('when the genre filter hides every saved show', () => {
    it('given ?genre=Western, when the page mounts, then the empty state names the genre', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);

      await renderSavedShows('bookmarks', '/bookmarked?genre=Western');
      await flushPromises();

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
        'Nothing bookmarked in Western yet.',
      );
    });
  });
});
