import { fireEvent, render, screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import AppHeader from '@/components/app/AppHeader.vue';
import { SEARCH_DEBOUNCE_MS } from '@/composables/useSearchQuery';
import { createComponentRouter } from '../builders';

let router: Router;

async function renderHeaderAt(location: string): Promise<void> {
  router = await createComponentRouter(location);
  render(AppHeader, { global: { plugins: [router] } });
}

const typeInSearch = (text: string): Promise<void> => fireEvent.update(searchBox(), text);

/** What the reader typed reaches the URL only after a pause in typing. */
async function settleSearchWrite(): Promise<void> {
  await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  await flushPromises();
}

async function chooseGenre(genre: string): Promise<void> {
  await fireEvent.update(genreSelect(), genre);
  await flushPromises();
}

const searchBox = (): HTMLElement =>
  screen.getByRole('searchbox', { name: 'Search shows by title' });

const genreSelect = (): HTMLElement => screen.getByRole('combobox', { name: 'Filter by genre' });

const currentPath = (): string => router.currentRoute.value.fullPath;

function searchText(): string {
  const field = searchBox();

  return field instanceof HTMLInputElement ? field.value : '';
}

beforeEach(async () => {
  vi.useFakeTimers();
  await renderHeaderAt('/');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AppHeader', () => {
  describe('when the header is rendered', () => {
    it('given any route, when rendered, then the brand leads to the dashboard', () => {
      expect(screen.getByRole('link', { name: 'TV Board' }).getAttribute('href')).toBe('/');
    });

    it('given the brand text, when rendered, then no aria-label competes with it', () => {
      expect(screen.getByRole('link', { name: 'TV Board' }).hasAttribute('aria-label')).toBe(false);
    });

    it('given any route, when rendered, then the search field is labelled', () => {
      expect(searchBox()).toBeDefined();
    });

    it('given any route, when rendered, then the genre filter is labelled', () => {
      expect(genreSelect()).toBeDefined();
    });
  });

  describe('when a title is typed', () => {
    it('given the dashboard, when a title is typed, then the search page opens with the query', async () => {
      await typeInSearch('fleabag');
      await settleSearchWrite();

      expect(currentPath()).toBe('/search?q=fleabag');
    });

    it('given a keystroke, when the pause has not elapsed, then the URL is unchanged', async () => {
      await typeInSearch('fleabag');

      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);

      expect(currentPath()).toBe('/');
    });

    it('given a trailing space, when the URL is written, then the query is trimmed', async () => {
      await typeInSearch('fleabag ');
      await settleSearchWrite();

      expect(currentPath()).toBe('/search?q=fleabag');
    });

    it('given a trailing space, when the URL is written, then the field keeps the space', async () => {
      await typeInSearch('fleabag ');
      await settleSearchWrite();

      expect(searchText()).toBe('fleabag ');
    });

    it('given a typed title, when it is cleared, then the dashboard comes back', async () => {
      await typeInSearch('fleabag');
      await settleSearchWrite();

      await typeInSearch('');
      await settleSearchWrite();

      expect(currentPath()).toBe('/');
    });
  });

  describe('when a genre is chosen', () => {
    it('given the dashboard, when Drama is chosen, then the route carries the filter', async () => {
      await chooseGenre('Drama');

      expect(currentPath()).toBe('/?genre=Drama');
    });

    it('given a filtered route, when All genres is chosen, then the filter is dropped', async () => {
      await chooseGenre('Drama');

      await chooseGenre('');

      expect(currentPath()).toBe('/');
    });
  });

  describe('when the route changes elsewhere', () => {
    it('given a search opened from a link, when it settles, then the field shows the query', async () => {
      await router.push('/search?q=dune');
      await flushPromises();

      expect(searchText()).toBe('dune');
    });
  });
});
