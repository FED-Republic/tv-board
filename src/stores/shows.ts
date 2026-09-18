import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { AbortError, type ApiError, HttpError, toApiError } from '@/domain/api-error';
import { type AsyncState, error, idle, loading, success } from '@/domain/async-state';
import {
  type Genre,
  type GenreLayout,
  genreLayoutOf,
  type GenreRow,
  groupByGenre,
  ROW_SHOW_LIMIT,
  showsInGenre,
} from '@/domain/genre';
import { NotFoundError } from '@/domain/not-found-error';
import { type Show, type ShowDetail, type ShowId, toShow } from '@/domain/show';
import { INDEX_PAGE_COUNT } from '@/services/tvmaze/config';
import { getShow, getShows, getShowsPage } from '@/services/tvmaze/endpoints';
import {
  type IndexCache,
  readGenreCache,
  readIndexCache,
  writeGenreCache,
  writeIndexCache,
} from '@/stores/shows-cache';
import { createPageScheduler } from '@/stores/shows-scheduler';

export const PAGE_SPACING_MS = 600;
/** How long a failed background page waits before its one retry; long enough for a blip to pass. */
export const PAGE_RETRY_DELAY_MS = 5000;

const FIRST_PAGE = 0;
/** Attempts a background page gets beyond its first; the loop stops quietly after them. */
const BACKGROUND_PAGE_RETRIES = 1;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * The show index: page 0 renders the dashboard, later pages load in the background and widen
 * the genre rows. Cached in `sessionStorage` for a day so a reload costs no request. Full show
 * details are kept for the session, never cached.
 */
export const useShowsStore = defineStore('shows', () => {
  const index = shallowRef<ReadonlyMap<ShowId, Show>>(new Map());
  const details = shallowRef<ReadonlyMap<ShowId, ShowDetail>>(new Map());
  const loadState = ref<AsyncState<null, ApiError>>(idle());
  const pagesLoaded = ref(0);
  const reachedEnd = ref(false);
  const isLoadingMore = ref(false);
  const rememberedGenres: readonly Genre[] = readGenreCache();
  const scheduler = createPageScheduler();
  /** Ids TVmaze answered `404` for this session; asking again would only cost a request. */
  const deletedIds = new Set<ShowId>();
  const isLayoutFrozen = ref(false);
  const pinnedLayout = shallowRef<GenreLayout | null>(null);

  let controller = new AbortController();
  let pageRetriesLeft = BACKGROUND_PAGE_RETRIES;

  const shows = computed(() => [...index.value.values()]);
  const isIndexComplete = computed(() => reachedEnd.value || pagesLoaded.value >= INDEX_PAGE_COUNT);
  const indexProgress = computed(() => {
    if (isIndexComplete.value) {
      return 1;
    }

    return pagesLoaded.value / INDEX_PAGE_COUNT;
  });
  /** Whether TVmaze may still have a page the index has never asked for. */
  const hasMorePages = computed(() => !reachedEnd.value);
  /** Which genres earn a row of the loaded shows. */
  const liveGenreLayout = computed<GenreLayout>(() => genreLayoutOf(shows.value));
  /** What the rows and the grid are both grouped by: the pin while one holds, else the live one. */
  const genreLayout = computed<GenreLayout>(() => pinnedLayout.value ?? liveGenreLayout.value);
  const indexState = computed<AsyncState<readonly Show[], ApiError>>(() => {
    const state = loadState.value;

    if (state.status !== 'success') {
      return state;
    }

    return success(shows.value);
  });
  const byGenre = computed<readonly GenreRow[]>(() => {
    if (loadState.value.status !== 'success') {
      return [];
    }

    return groupByGenre(shows.value, genreLayout.value, ROW_SHOW_LIMIT);
  });
  /** The genres of the loaded rows; before the index lands, the ones the last visit saw. */
  const knownGenres = computed<readonly Genre[]>(() => {
    if (byGenre.value.length === 0) {
      return rememberedGenres;
    }

    return byGenre.value.map((row) => row.genre);
  });

  const getShowById = (id: ShowId): Show | null => index.value.get(id) ?? null;
  /** Every loaded show of the genre in rating order: what the genre grid pages through. */
  const genreShows = (genre: Genre): readonly Show[] =>
    showsInGenre(shows.value, genre, genreLayout.value);
  /** Whether nothing remains to fetch for the id: it is in the index or TVmaze no longer has it. */
  const hasSettled = (id: ShowId): boolean => index.value.has(id) || deletedIds.has(id);
  const getShowDetailById = (id: ShowId): ShowDetail | null => details.value.get(id) ?? null;

  /**
   * Holds the promotion set still while the reader has the `Other` grid open: a genre that
   * reaches `ROW_MIN_SHOWS` under them would take its shows out of the grid they are reading.
   * Counts only grow, so promotion is the one transition worth withholding, and it lands as the
   * grid closes.
   */
  function setGenreLayoutFrozen(isFrozen: boolean): void {
    if (!isFrozen) {
      releaseGenreLayout();
      return;
    }

    isLayoutFrozen.value = true;
    pinLayoutIfFrozen();
  }

  /** Gives the rows their own layout back, and writes what the freeze kept from the cache. */
  function releaseGenreLayout(): void {
    // Nothing to give back, and the dashboard changes genre far more often than it freezes: the
    // guard is what keeps a navigation from rewriting the genre cache with the value it holds.
    if (!isLayoutFrozen.value) {
      return;
    }

    isLayoutFrozen.value = false;
    pinnedLayout.value = null;
    rememberAcrossVisits();
  }

  /**
   * Pinning before the first shows land would pin an empty layout and drop the whole index into
   * `Other`, and a grid with nothing in it has nothing to hold still. So the pin waits for the
   * corpus and is taken on the first merge that brings one.
   */
  function pinLayoutIfFrozen(): void {
    const canPin = isLayoutFrozen.value && pinnedLayout.value === null;

    if (!canPin || shows.value.length === 0) {
      return;
    }

    pinnedLayout.value = liveGenreLayout.value;
  }

  async function loadIndex(): Promise<void> {
    if (loadState.value.status === 'success') {
      resumeBackgroundLoading();
      return;
    }

    if (loadState.value.status !== 'idle') {
      return;
    }

    const cached = readIndexCache();

    if (cached !== null) {
      restoreFromCache(cached);
      resumeBackgroundLoading();
      return;
    }

    await loadFirstPage();
  }

  async function retry(): Promise<void> {
    if (loadState.value.status !== 'error') {
      return;
    }

    loadState.value = idle();
    await loadIndex();
  }

  /**
   * The next page the index has not asked for, for the genre grid's "Load more". A page already
   * on its way counts as the press, and a failure settles on the background loop's rules, so
   * pressing again is the retry.
   */
  async function loadMore(): Promise<void> {
    const canLoadPage =
      loadState.value.status === 'success' && !isLoadingMore.value && !reachedEnd.value;

    if (!canLoadPage) {
      return;
    }

    if (controller.signal.aborted) {
      controller = new AbortController();
    }

    pageRetriesLeft = BACKGROUND_PAGE_RETRIES;
    isLoadingMore.value = true;
    await loadNextPage();
  }

  /**
   * Shows for `ids` in that order. Ids missing from the index are fetched a few at a time and
   * merged, even when one of the requests fails: the failure is thrown after the merge, so a
   * retry only asks for what is still missing. An id TVmaze no longer has is left out.
   */
  async function ensureShows(
    ids: readonly ShowId[],
    signal?: AbortSignal,
  ): Promise<readonly Show[]> {
    const missing = ids.filter((id) => !hasSettled(id));

    if (missing.length > 0) {
      const batch = await getShows(missing, signal);

      merge(batch.found);
      batch.deleted.forEach((id) => deletedIds.add(id));
      throwIfAborted(signal);

      if (batch.failure !== null) {
        throw batch.failure;
      }
    }

    return ids.flatMap((id) => index.value.get(id) ?? []);
  }

  /** The full show for the detail page; a show TVmaze no longer has is a `NotFoundError`. */
  async function loadShowDetail(id: ShowId, signal?: AbortSignal): Promise<ShowDetail> {
    const known = details.value.get(id);

    if (known !== undefined) {
      return known;
    }

    const detail = await fetchDetail(id, signal);

    details.value = new Map(details.value).set(id, detail);
    merge([toShow(detail)]);

    return detail;
  }

  /** Cancels the page in flight and the background loop; a cancelled first page is idle again. */
  function abort(): void {
    controller.abort();
    scheduler.cancel();
    isLoadingMore.value = false;

    if (loadState.value.status === 'loading') {
      loadState.value = idle();
    }
  }

  async function loadFirstPage(): Promise<void> {
    loadState.value = loading();
    controller = new AbortController();

    let firstPage: readonly Show[];

    try {
      firstPage = await getShowsPage(FIRST_PAGE, controller.signal);
    } catch (reason) {
      const failure = toApiError(reason);

      loadState.value = failure instanceof AbortError ? idle() : error(failure);
      return;
    }

    merge(firstPage);
    pagesLoaded.value = 1;
    loadState.value = success(null);
    persist();
    resumeBackgroundLoading();
  }

  function resumeBackgroundLoading(): void {
    if (isIndexComplete.value || isLoadingMore.value) {
      return;
    }

    if (controller.signal.aborted) {
      controller = new AbortController();
    }

    // A loop starting again after a remount gets its budget back.
    pageRetriesLeft = BACKGROUND_PAGE_RETRIES;
    isLoadingMore.value = true;
    scheduler.whenIdle(() => {
      void loadNextPage();
    });
  }

  async function loadNextPage(): Promise<void> {
    const { signal } = controller;

    try {
      const page = await getShowsPage(pagesLoaded.value, signal);

      if (signal.aborted) {
        return;
      }

      merge(page);
      pagesLoaded.value += 1;
      // A page that lands proves the network is back, so a later blip gets its own retry.
      pageRetriesLeft = BACKGROUND_PAGE_RETRIES;
      persist();
    } catch (reason) {
      settleBackgroundFailure(toApiError(reason));
      return;
    }

    if (isIndexComplete.value) {
      isLoadingMore.value = false;
      return;
    }

    scheduler.after(PAGE_SPACING_MS, () => {
      void loadNextPage();
    });
  }

  /**
   * Past the last page is completion. A failure worth another attempt gets one after a pause,
   * because this loop is the only thing that widens the rows a visit opened with: without it a
   * reader who never leaves the dashboard keeps the rows a restored session cache gave them.
   * Loading more stays true across that pause, so a remount cannot start a second loop over it.
   * Anything else stops the loop quietly, leaving the rows that have loaded on screen.
   */
  function settleBackgroundFailure(failure: ApiError): void {
    // A failure that lost a race with `abort()` must not leave a timer behind it.
    if (failure instanceof AbortError || controller.signal.aborted) {
      return;
    }

    if (isDeleted(failure)) {
      reachedEnd.value = true;
      persist();
    }

    if (canRetryPage(failure)) {
      pageRetriesLeft -= 1;
      retryPageAfterPause();
      return;
    }

    isLoadingMore.value = false;
  }

  /**
   * Past the last page there is nothing to ask for again, and a `429` has already been backed
   * off and retried inside the HTTP client: asking once more would only spend the same quota.
   * A rate-limited loop waits for the next dashboard mount rather than for the limit to lift.
   */
  function canRetryPage(failure: ApiError): boolean {
    if (isDeleted(failure) || isRateLimited(failure)) {
      return false;
    }

    return pageRetriesLeft > 0;
  }

  function retryPageAfterPause(): void {
    scheduler.after(PAGE_RETRY_DELAY_MS, () => {
      void loadNextPage();
    });
  }

  function merge(incoming: readonly Show[]): void {
    const next = new Map(index.value);

    for (const show of incoming) {
      next.set(show.id, show);
    }

    index.value = next;
    pinLayoutIfFrozen();
  }

  function restoreFromCache(cache: IndexCache): void {
    merge(cache.shows);
    pagesLoaded.value = cache.pagesLoaded;
    reachedEnd.value = cache.reachedEnd;
    loadState.value = success(null);
    rememberAcrossVisits();
  }

  function persist(): void {
    const cache: IndexCache = {
      savedAt: Date.now(),
      pagesLoaded: pagesLoaded.value,
      reachedEnd: reachedEnd.value,
      shows: shows.value,
    };

    writeIndexCache(cache);
    rememberAcrossVisits();
  }

  /** What outlives the tab: the genre names the next visit's placeholder rows carry. */
  function rememberAcrossVisits(): void {
    // A pinned layout is not the corpus's own, so the genres it names are not worth keeping.
    // The release writes them once the pin is gone.
    if (pinnedLayout.value !== null) {
      return;
    }

    writeGenreCache(knownGenres.value);
  }

  return {
    indexState,
    byGenre,
    knownGenres,
    pagesLoaded: computed(() => pagesLoaded.value),
    isIndexComplete,
    hasMorePages,
    indexProgress,
    isLoadingMore: computed(() => isLoadingMore.value),
    getShowById,
    genreShows,
    getShowDetailById,
    hasSettled,
    loadIndex,
    retry,
    loadMore,
    setGenreLayoutFrozen,
    ensureShows,
    loadShowDetail,
    abort,
  };
});

async function fetchDetail(id: ShowId, signal: AbortSignal | undefined): Promise<ShowDetail> {
  try {
    return await getShow(id, signal);
  } catch (reason) {
    const failure = toApiError(reason);

    throw isDeleted(failure) ? new NotFoundError() : failure;
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new AbortError();
  }
}

const isDeleted = (failure: ApiError): boolean =>
  failure instanceof HttpError && failure.status === HTTP_NOT_FOUND;

const isRateLimited = (failure: ApiError): boolean =>
  failure instanceof HttpError && failure.status === HTTP_TOO_MANY_REQUESTS;
