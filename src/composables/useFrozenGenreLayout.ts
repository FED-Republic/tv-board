import { type MaybeRefOrGetter, onScopeDispose, toValue, watch } from 'vue';
import { type Genre, OTHER_GENRE } from '@/domain/genre';
import { useShowsStore } from '@/stores/shows';

/**
 * Freezes the dashboard's promotion set while the reader has the `Other` grid open: a genre that
 * reaches `ROW_MIN_SHOWS` under them would pull its shows out of the grid they are reading. Every
 * other grid is left alone, because a promotion behind one only adds a row. The freeze lifts when
 * the grid closes and when the page goes, so it can never outlive the dashboard.
 */
export function useFrozenGenreLayout(genre: MaybeRefOrGetter<Genre | null>): void {
  const shows = useShowsStore();

  watch(
    () => toValue(genre),
    (next) => {
      shows.setGenreLayoutFrozen(next === OTHER_GENRE);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    shows.setGenreLayoutFrozen(false);
  });
}
