/** The shared setup for the specs on the background page loop. */

import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { vi } from 'vitest';
import type { ApiError } from '@/domain/api-error';
import type { AsyncState } from '@/domain/async-state';
import { type Genre, ROW_MIN_SHOWS } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { PAGE_RETRY_DELAY_MS, PAGE_SPACING_MS, useShowsStore } from '@/stores/shows';
import { type ShowPayload, TEMPLATE_PAYLOAD } from './captured-show';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
/**
 * Long enough for the whole loop to run out: two pages that each fail, wait out a retry pause
 * and fail again still settle inside it, so no spec leaves a timer behind.
 */
const BACKGROUND_WINDOW_MS = 30_000;
/** A millisecond short of the pause: the failure has landed and the retry has not run yet. */
const BEFORE_THE_RETRY_MS = PAGE_RETRY_DELAY_MS - 1;
const TOP_RATING = 9.9;
const RATING_STEP = 0.1;

export const PAGE_ZERO_SHOW_COUNT = 240;

export type ShowsStore = ReturnType<typeof useShowsStore>;
export type PageResponder = (page: string) => Promise<Response> | Response;

/** A loaded store together with the pages it has asked the index endpoint for, in order. */
export type StartedIndex = {
  readonly store: ShowsStore;
  readonly requestedPages: readonly string[];
};

export const wholePage = (): Response => HttpResponse.json(pageZeroPayload);
export const notFound = (): Response => new HttpResponse(null, { status: 404 });
export const serverError = (): Response => new HttpResponse(null, { status: 500 });
/** A rate limit the HTTP client backs off and retries on its own, inside its own budget. */
export const rateLimited = (): Response => new HttpResponse(null, { status: 429 });
/** A request that never reaches the server: the client does not retry it, the store does. */
export const unreachable = (): Response => HttpResponse.error();

/** A page of `count` shows in one genre, rated from the top down, so their order is unambiguous. */
export function genrePage(genre: Genre, count: number, firstId: number): Response {
  const shows = Array.from({ length: count }, (_unused, index) => ({
    ...TEMPLATE_PAYLOAD,
    id: firstId + index,
    name: `${genre} ${index + 1}`,
    genres: [genre],
    rating: { average: TOP_RATING - index * RATING_STEP },
  }));

  return HttpResponse.json(shows);
}

/**
 * `count` shows listing every one of `genres`, rated from the top down. A corpus measured
 * against `ROW_MIN_SHOWS` is built from several of these, so a page can hold a genre at the bar
 * and one under it at once.
 */
export function showsListing(
  genres: readonly Genre[],
  count: number,
  firstId: number,
): readonly ShowPayload[] {
  return Array.from({ length: count }, (_unused, index) =>
    showPayload(genres, firstId + index, TOP_RATING - index * RATING_STEP),
  );
}

/** One show listing `genres`, for the endpoint that answers a single id. */
export const showListing = (genres: readonly Genre[], id: number): ShowPayload =>
  showPayload(genres, id, TOP_RATING);

/** The captured payload with only the fields a row-minimum corpus cares about replaced. */
function showPayload(genres: readonly Genre[], id: number, rating: number): ShowPayload {
  return {
    ...TEMPLATE_PAYLOAD,
    id,
    name: `Show ${id}`,
    genres: [...genres],
    rating: { average: rating },
  };
}

/** One index page holding exactly these shows. */
export const pageOf = (shows: readonly ShowPayload[]): Response => HttpResponse.json(shows);

export const FIRST_DRAMA_ID = 1;
export const FIRST_COMEDY_ID = 100;
/** The show whose arrival carries Comedy over the bar, on a page of its own. */
export const PROMOTING_COMEDY_ID = 200;

/** Drama at the bar, so it earns a row of its own. */
export const DRAMA_AT_THE_BAR = showsListing(['Drama'], ROW_MIN_SHOWS, FIRST_DRAMA_ID);
/** Comedy one show short of the bar, so its shows wait in `Other`. */
export const COMEDY_UNDER_THE_BAR = showsListing(['Comedy'], ROW_MIN_SHOWS - 1, FIRST_COMEDY_ID);

export const comedyIds = (): readonly number[] => COMEDY_UNDER_THE_BAR.map((show) => show.id);

/** Page 0 holds Drama at the bar beside a Comedy short of it, and nothing follows. */
export const dramaOverThinComedy: PageResponder = (page) =>
  page === '0' ? pageOf([...DRAMA_AT_THE_BAR, ...COMEDY_UNDER_THE_BAR]) : notFound();

/** Page 0 holds Drama at the bar alone, so every loaded show has a row and `Other` is empty. */
export const dramaAlone: PageResponder = (page) =>
  page === '0' ? pageOf(DRAMA_AT_THE_BAR) : notFound();

/** The same page 0, with a page 1 whose one show carries Comedy over the bar. */
export const comedyPromotedOnPageOne: PageResponder = (page) => {
  if (page === '1') {
    return pageOf(showsListing(['Comedy'], 1, PROMOTING_COMEDY_ID));
  }

  return dramaOverThinComedy(page);
};

/** Answers the index endpoint with `respond` and records every page the store asked for. */
export function serveIndexPages(respond: PageResponder): string[] {
  const requestedPages: string[] = [];

  server.use(
    http.get(INDEX_URL, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      requestedPages.push(page);
      return respond(page);
    }),
  );

  return requestedPages;
}

export async function storeWithFirstPage(respond: PageResponder): Promise<StartedIndex> {
  const requestedPages = serveIndexPages(respond);
  const store = useShowsStore();

  await store.loadIndex();

  return { store, requestedPages };
}

export const showsOf = (state: AsyncState<readonly Show[], ApiError>): readonly Show[] =>
  state.status === 'success' ? state.data : [];

/** The first background page runs on the idle callback, which the shim fires on the next tick. */
export async function settleFirstBackgroundPage(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  await flushPromises();
}

/** Every later page waits one spacing, so advancing exactly that lands exactly one page. */
export async function settleNextBackgroundPage(): Promise<void> {
  await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS);
  await flushPromises();
}

/** Up to the moment a failed page is waiting out its pause, with the retry still to come. */
export async function settleFailureBeforeRetry(): Promise<void> {
  await vi.advanceTimersByTimeAsync(BEFORE_THE_RETRY_MS);
  await flushPromises();
}

/** The pause a failed page waits out, so the attempt after it runs. */
export async function settleRetryPause(): Promise<void> {
  await vi.advanceTimersByTimeAsync(PAGE_RETRY_DELAY_MS);
  await flushPromises();
}

export async function settleBackgroundPages(): Promise<void> {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  await flushPromises();
}

export function activateBackgroundPinia(): void {
  vi.useFakeTimers();
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
}

/** Lets the loop run out, so its timers never leak into the next test. */
export async function releaseTimers(): Promise<void> {
  await settleBackgroundPages();
  vi.useRealTimers();
}
