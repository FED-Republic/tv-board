import { computed, type ComputedRef } from 'vue';
import { useAsyncResource } from '@/composables/useAsyncResource';
import { useGenreFilter } from '@/composables/useGenreFilter';
import { useSearchQuery } from '@/composables/useSearchQuery';
import { type AsyncState, idle, success } from '@/domain/async-state';
import { type Genre, hasGenre } from '@/domain/genre';
import type { LoadError } from '@/domain/load-error';
import type { Show } from '@/domain/show';
import { searchShows } from '@/services/tvmaze/endpoints';

type SearchResults = {
  readonly query: ComputedRef<string>;
  readonly shows: ComputedRef<AsyncState<readonly Show[], LoadError>>;
  readonly retry: () => void;
};

type FoundShows = AsyncState<readonly Show[], LoadError>;

const NOTHING_SEARCHED: readonly Show[] = [];

/**
 * Name search for the `?q=` query, narrowed by the `?genre=` filter. The query is already
 * debounced on its way into the URL; `useAsyncResource` aborts the request an older query
 * started, so its reply never overwrites a newer one, and cancels what is pending on leaving.
 */
export function useSearchResults(): SearchResults {
  const { query } = useSearchQuery();
  const { genre } = useGenreFilter();

  const { state, retry } = useAsyncResource(query, (signal) => findShows(query.value, signal));

  const shows = computed<FoundShows>(() => {
    if (query.value === '') {
      return idle();
    }

    return narrowToGenre(state.value, genre.value);
  });

  return { query, shows, retry };
}

/** An empty query settles at once, with no request and no loading state. */
function findShows(term: string, signal: AbortSignal): readonly Show[] | Promise<readonly Show[]> {
  if (term === '') {
    return NOTHING_SEARCHED;
  }

  return searchShows(term, signal);
}

function narrowToGenre(found: FoundShows, selected: Genre | null): FoundShows {
  if (found.status !== 'success' || selected === null) {
    return found;
  }

  return success(found.data.filter((show) => hasGenre(show, selected)));
}
