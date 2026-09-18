import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import ShowDetailPage from '@/pages/ShowDetailPage.vue';
import { createAppRouter } from '@/router';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { TEST_IDS } from '@/testing/test-ids';
import { server } from '../../msw/server';
import breakingBadPayload from '../../resources/show-169.2026-09-16.json';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
const BREAKING_BAD_ID = '169';
const MISSING_ID = '99999';
/** The client retries a `5xx` once, so a failure needs two answers. */
const FAILED_ATTEMPTS = 2;

let pinia: TestingPinia;

const serverError = (): Response => new HttpResponse(null, { status: 500 });

/** Fails until the retry budget is spent, then serves the captured show. */
function serveShowAfterRetry(): void {
  let failures = 0;

  server.use(
    http.get(SHOW_URL, () => {
      if (failures === FAILED_ATTEMPTS) {
        return HttpResponse.json(breakingBadPayload);
      }

      failures += 1;
      return serverError();
    }),
  );
}

const serveBrokenApi = (): void => void server.use(http.get(SHOW_URL, serverError));

/** The index stays empty, so the page always resolves the show through `GET /shows/:id`. */
async function renderDetailFor(id: string): Promise<void> {
  const router = createAppRouter(createMemoryHistory());

  await router.push(`/shows/${id}`);
  await router.isReady();
  render(ShowDetailPage, { props: { id }, global: { plugins: [pinia, router] } });
}

async function settleFailedRequest(): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
  await flushPromises();
}

const page = (): HTMLElement => screen.getByTestId(TEST_IDS.showDetailPage);

/** The name warns where the link goes, so nobody is surprised by a new tab (WCAG 3.2.5). */
const sourceLink = (): HTMLElement =>
  screen.getByRole('link', { name: 'Open on TVmaze (opens in a new tab)' });

const genreChipTexts = (): readonly string[] =>
  within(screen.getByTestId(TEST_IDS.showDetailChips))
    .getAllByTestId(TEST_IDS.genreChip)
    .map((chip) => chip.textContent?.trim() ?? '');

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ShowDetailPage', () => {
  describe('when the show is still loading', () => {
    it('given an empty index, when the page mounts, then the root reports loading', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      expect(page().dataset['state']).toBe('loading');
    });

    it('given an empty index, when the page mounts, then a level-1 heading names the wait', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Loading the show');
    });
  });

  describe('when the show lands', () => {
    it('given show 169, when it resolves, then the root reports success', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(page().dataset['state']).toBe('success');
    });

    it('given show 169, when it resolves, then the name is the page heading', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Breaking Bad');
    });

    it('given show 169, when it resolves, then the poster shows the original image', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByTestId(TEST_IDS.showPoster).dataset['source']).toBe('original');
    });

    it('given show 169, when it resolves, then the poster loads the captured original url', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      const image = screen.getByTestId(TEST_IDS.showPosterImage);

      expect(image.getAttribute('src')).toBe(breakingBadPayload.image.original);
    });

    it('given show 169, when it resolves, then the rating is shown', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByTestId(TEST_IDS.ratingMark).textContent?.trim()).toBe('9.2');
    });

    it('given show 169, when it resolves, then the rating is named for the reader', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByText('average rating')).toBeDefined();
    });

    it('given show 169, when it resolves, then every genre gets a chip', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(genreChipTexts()).toEqual(['Drama', 'Crime', 'Thriller']);
    });

    it('given show 169, when it resolves, then the facts list names the network', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(within(screen.getByTestId(TEST_IDS.showFacts)).getByText('AMC')).toBeDefined();
    });

    it('given show 169, when it resolves, then the summary is rendered', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByTestId(TEST_IDS.showSummary).textContent).toContain('Walter White');
    });

    it('given show 169, when it resolves, then the bookmark button reads Bookmark', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByRole('button', { name: 'Bookmark' }).ariaPressed).toBe('false');
    });

    it('given show 169, when the bookmark is pressed, then the button announces itself pressed', async () => {
      await renderDetailFor(BREAKING_BAD_ID);
      await flushPromises();

      await fireEvent.click(screen.getByRole('button', { name: 'Bookmark' }));

      expect(screen.getByRole('button', { name: 'Bookmark' }).ariaPressed).toBe('true');
    });

    it('given show 169, when it resolves, then the like button reads Like', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByRole('button', { name: 'Like' }).ariaPressed).toBe('false');
    });

    it('given show 169, when it resolves, then TVmaze is linked in a new tab', async () => {
      await renderDetailFor(BREAKING_BAD_ID);
      await flushPromises();

      expect(sourceLink().getAttribute('target')).toBe('_blank');
    });

    it('given show 169, when it resolves, then the TVmaze link leaks no referrer', async () => {
      await renderDetailFor(BREAKING_BAD_ID);
      await flushPromises();

      expect(sourceLink().getAttribute('rel')).toBe('noreferrer');
    });

    it('given show 169, when it resolves, then the document title names the show', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(document.title).toBe('Breaking Bad · TV Board');
    });

    it('given show 169, when it resolves, then Back leads to the dashboard', async () => {
      await renderDetailFor(BREAKING_BAD_ID);

      await flushPromises();

      expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/');
    });
  });

  describe('when the id is not a show id', () => {
    it('given the id abc, when the page mounts, then it reports the show as missing', async () => {
      await renderDetailFor('abc');

      await flushPromises();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Show not found');
    });

    it('given the id abc, when the page mounts, then the root reports error', async () => {
      await renderDetailFor('abc');

      await flushPromises();

      expect(page().dataset['state']).toBe('error');
    });
  });

  describe('when TVmaze knows no such show', () => {
    it('given a 404, when the request settles, then it reports the show as missing', async () => {
      await renderDetailFor(MISSING_ID);

      await flushPromises();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Show not found');
    });

    it('given a 404, when the request settles, then the body explains the address', async () => {
      await renderDetailFor(MISSING_ID);

      await flushPromises();

      expect(screen.getByText('There is no show at this address.')).toBeDefined();
    });
  });

  describe('when the request fails', () => {
    it('given a 500 on every attempt, when the load settles, then an alert names the failure', async () => {
      serveBrokenApi();
      await renderDetailFor(BREAKING_BAD_ID);

      await settleFailedRequest();

      expect(within(screen.getByRole('alert')).getByText("This show didn't load.")).toBeDefined();
    });

    it('given a 500 on every attempt, when the load settles, then a level-1 heading names the page', async () => {
      serveBrokenApi();
      await renderDetailFor(BREAKING_BAD_ID);

      await settleFailedRequest();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Show');
    });

    it('given a 500 on every attempt, when the load settles, then the alert explains the status', async () => {
      serveBrokenApi();
      await renderDetailFor(BREAKING_BAD_ID);

      await settleFailedRequest();

      expect(
        within(screen.getByRole('alert')).getByText(
          'TVmaze answered with an error (HTTP 500). Retry in a moment.',
        ),
      ).toBeDefined();
    });

    it('given a failed load, when the retry succeeds, then the show replaces the alert', async () => {
      serveShowAfterRetry();
      await renderDetailFor(BREAKING_BAD_ID);
      await settleFailedRequest();

      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await flushPromises();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Breaking Bad');
    });
  });
});
