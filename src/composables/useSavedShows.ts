import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useAsyncResource } from '@/composables/useAsyncResource';
import { useGenreFilter } from '@/composables/useGenreFilter';
import { type AsyncState, success } from '@/domain/async-state';
import { hasGenre, sortByRating } from '@/domain/genre';
import type { LoadError } from '@/domain/load-error';
import type { SavedKind } from '@/domain/saved';
import type { Show, ShowId } from '@/domain/show';
import { useSavedStore } from '@/stores/saved';
import { useShowsStore } from '@/stores/shows';

type SavedShows = {
  readonly shows: ComputedRef<AsyncState<readonly Show[], LoadError>>;
  readonly retry: () => Promise<void>;
};

type ShowsIndex = Pick<
  ReturnType<typeof useShowsStore>,
  'getShowById' | 'hasSettled' | 'ensureShows'
>;

/**
 * The bookmarked or liked shows, resolved against the index first and fetched a few at a time
 * for the rest; sorted by rating and narrowed by the `?genre=` filter.
 */
export function useSavedShows(kind: MaybeRefOrGetter<SavedKind>): SavedShows {
  const saved = useSavedStore();
  const showsStore = useShowsStore();
  const { genre } = useGenreFilter();

  const ids = computed<readonly ShowId[]>(() => [...saved.idsOf(toValue(kind))]);
  const { state: resolved, retry } = useAsyncResource(ids, (signal) =>
    resolveShows(showsStore, ids.value, signal),
  );
  const shows = computed<AsyncState<readonly Show[], LoadError>>(() => {
    if (resolved.value.status !== 'success') {
      return resolved.value;
    }

    const selected = genre.value;
    const matching =
      selected === null
        ? resolved.value.data
        : resolved.value.data.filter((show) => hasGenre(show, selected));

    return success(sortByRating(matching));
  });

  return { shows, retry };
}

/** Ids the index already holds, or knows TVmaze deleted, resolve at once without a loading state. */
function resolveShows(
  index: ShowsIndex,
  wanted: readonly ShowId[],
  signal: AbortSignal,
): readonly Show[] | Promise<readonly Show[]> {
  if (wanted.every(index.hasSettled)) {
    return wanted.flatMap((id) => index.getShowById(id) ?? []);
  }

  return index.ensureShows(wanted, signal);
}
