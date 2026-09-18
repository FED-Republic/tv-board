import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { createMemoryHistory } from 'vue-router';
import App from '@/App.vue';
import { SEARCH_DEBOUNCE_MS } from '@/composables/useSearchQuery';
import { createAppRouter } from '@/router';

/** A page that neither fetches nor renders a grid, so the shell is all that is under test. */
const QUIET_ROUTE = '/nowhere';

/** The search page with one letter already typed, so clearing the field navigates home. */
const SEARCH_ROUTE = '/search?q=a';

const SEARCH_FIELD_NAME = 'Search shows by title';

let pinia: TestingPinia;
let router: Router;

async function renderShellAt(location: string): Promise<void> {
  router = createAppRouter(createMemoryHistory());

  await router.push(location);
  await router.isReady();
  render(App, { global: { plugins: [pinia, router] } });
}

async function navigateTo(location: string): Promise<void> {
  await router.push(location);
  await flushPromises();
}

const mainLandmark = (): HTMLElement => screen.getByRole('main');

const searchField = (): HTMLElement => screen.getByRole('searchbox', { name: SEARCH_FIELD_NAME });

const navLink = (name: string): HTMLElement =>
  within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name });

/** The reader is typing, so the caret sits in the field while the query rewrites the route. */
async function typeInSearchField(text: string): Promise<void> {
  const field = searchField();

  field.focus();
  await fireEvent.update(field, text);
  await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  await flushPromises();
}

// The search route is lazy. Loading its module once here keeps a later navigation to it inside
// microtasks, so `flushPromises()` settles it without waiting on real file reads.
beforeAll(async () => {
  await import('@/pages/SearchPage.vue');
});

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  describe('when the shell is rendered', () => {
    it('given any route, when rendered, then the skip link jumps to the content', async () => {
      await renderShellAt(QUIET_ROUTE);

      const skipLink = screen.getByRole('link', { name: 'Skip to content' });

      expect(skipLink.getAttribute('href')).toBe('#main');
    });

    it('given any route, when rendered, then the header is a banner landmark', async () => {
      await renderShellAt(QUIET_ROUTE);

      expect(screen.getByRole('banner')).toBeDefined();
    });

    it('given any route, when rendered, then the main landmark can take focus', async () => {
      await renderShellAt(QUIET_ROUTE);

      expect(mainLandmark().getAttribute('tabindex')).toBe('-1');
    });

    it('given any route, when rendered, then the footer credits TVmaze', async () => {
      await renderShellAt(QUIET_ROUTE);

      const credit = within(screen.getByRole('contentinfo')).getByRole('link', { name: /TVmaze/ });

      expect(credit.getAttribute('href')).toBe('https://www.tvmaze.com');
    });

    // The name warns where the link goes, so nobody is surprised by a new tab (WCAG 3.2.5).
    it('given any route, when rendered, then the credit announces the new tab', async () => {
      await renderShellAt(QUIET_ROUTE);

      const footer = within(screen.getByRole('contentinfo'));

      expect(footer.getByRole('link', { name: 'TVmaze, (opens in a new tab)' })).toBeDefined();
    });

    it('given a route away from home, when rendered, then the nav leads back to all genres', async () => {
      await renderShellAt(QUIET_ROUTE);

      const nav = screen.getByRole('navigation', { name: 'Main' });

      expect(within(nav).getByRole('link', { name: 'All Genres' })).toBeDefined();
    });
  });

  describe('when the route changes', () => {
    it('given a new page, when the navigation settles, then focus moves to the content', async () => {
      await renderShellAt(QUIET_ROUTE);

      await navigateTo('/bookmarked');

      expect(document.activeElement).toBe(mainLandmark());
    });

    it('given a nav link has focus, when the navigation settles, then focus moves to the content', async () => {
      await renderShellAt(QUIET_ROUTE);
      navLink('Bookmarked').focus();

      await navigateTo('/bookmarked');

      expect(document.activeElement).toBe(mainLandmark());
    });

    it('given a page away from search, when the first letter is typed, then the search page opens', async () => {
      await renderShellAt(QUIET_ROUTE);

      await typeInSearchField('a');

      expect(router.currentRoute.value.path).toBe('/search');
    });

    it('given the search field has focus, when typing takes the reader to the search page, then focus stays in the field', async () => {
      await renderShellAt(QUIET_ROUTE);

      await typeInSearchField('a');

      expect(document.activeElement).toBe(searchField());
    });

    it('given the search page, when the text is cleared, then the reader returns home', async () => {
      await renderShellAt(SEARCH_ROUTE);

      await typeInSearchField('');

      expect(router.currentRoute.value.path).toBe('/');
    });

    it('given the search field has focus, when the text is cleared and the reader returns home, then focus stays in the field', async () => {
      await renderShellAt(SEARCH_ROUTE);

      await typeInSearchField('');

      expect(document.activeElement).toBe(searchField());
    });
  });
});
