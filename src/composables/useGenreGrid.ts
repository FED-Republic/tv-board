import { storeToRefs } from 'pinia';
import { computed, type ComputedRef, ref } from 'vue';
import { useFrozenGenreLayout } from '@/composables/useFrozenGenreLayout';
import { useGenreView } from '@/composables/useGenreView';
import { type Genre, revealTargetOf } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';

type GenreGridView = {
  readonly genre: ComputedRef<Genre | null>;
  readonly revealedRow: ComputedRef<Genre | null>;
  readonly gridGenre: ComputedRef<Genre | null>;
  readonly gridShows: ComputedRef<readonly Show[]>;
  readonly isGridMode: ComputedRef<boolean>;
  readonly isRevealedGrid: ComputedRef<boolean>;
  readonly expand: (genre: Genre) => Promise<void>;
  readonly close: () => Promise<void>;
  readonly askForPage: () => void;
  readonly askFromEmpty: () => void;
};

/**
 * The dashboard's genre grid: the genre it holds, the shows it pages through, and the row that
 * takes focus when it closes. While the `Other` grid is open the promotion set is frozen, so no
 * page that lands can take its cards away while the reader is in it.
 */
export function useGenreGrid(): GenreGridView {
  const shows = useShowsStore();
  const { byGenre } = storeToRefs(shows);
  const { genre, revealedGenre, isGridRevealed, expand, close } = useGenreView();

  useFrozenGenreLayout(genre);

  const hasAskedFromEmpty = ref(false);

  // Every loaded show of the genre, not the row's top 25: the grid pages through them.
  const gridShows = computed<readonly Show[]>(() => showsOfGenre(genre.value));

  const gridGenre = computed<Genre | null>(() => (gridShows.value.length > 0 ? genre.value : null));
  const isGridMode = computed(() => genre.value !== null);
  // A grid that grew out of the empty state is one the reader asked for, so it takes their focus.
  const isRevealedGrid = computed(() => isGridRevealed.value || hasAskedFromEmpty.value);
  const revealedRow = computed(() => revealedRowOf(revealedGenre.value));

  /** The next index page the grid has not asked for; the shows it brings render as they land. */
  function askForPage(): void {
    void shows.loadMore();
  }

  /** The empty state's own press: the grid it may bring is the reader's, so it arrives revealed. */
  function askFromEmpty(): void {
    hasAskedFromEmpty.value = true;
    askForPage();
  }

  function showsOfGenre(rowGenre: Genre | null): readonly Show[] {
    if (rowGenre === null) {
      return [];
    }

    return shows.genreShows(rowGenre);
  }

  /** A grid whose genre earned no row of its own hands focus to the row that holds its shows. */
  function revealedRowOf(revealed: Genre | null): Genre | null {
    if (revealed === null) {
      return null;
    }

    return revealTargetOf(byGenre.value, revealed);
  }

  return {
    genre,
    revealedRow,
    gridGenre,
    gridShows,
    isGridMode,
    isRevealedGrid,
    expand,
    close,
    askForPage,
    askFromEmpty,
  };
}
