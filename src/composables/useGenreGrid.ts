import { storeToRefs } from 'pinia';
import { computed, type ComputedRef, ref, watch } from 'vue';
import { useFrozenGenreLayout } from '@/composables/useFrozenGenreLayout';
import { useGenreView } from '@/composables/useGenreView';
import type { PageReport } from '@/domain/dashboard-copy';
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
  readonly isAwaitingPage: ComputedRef<boolean>;
  readonly pageReport: ComputedRef<PageReport | null>;
  readonly expand: (genre: Genre) => Promise<void>;
  readonly close: () => Promise<void>;
  readonly askForPage: () => void;
  readonly askFromEmpty: () => void;
};

/** What the index and the open grid hold right now; a report is the growth between two of these. */
type LoadedCounts = {
  readonly loaded: number;
  readonly inGenre: number;
};

/**
 * The dashboard's genre grid: the genre it holds, the shows it pages through, and the row that
 * takes focus when it closes. While the `Other` grid is open the promotion set is frozen, so no
 * page that lands can take its cards away while the reader is in it.
 */
export function useGenreGrid(): GenreGridView {
  const shows = useShowsStore();
  const { byGenre, isLoadingMore, pagesLoaded, showCount } = storeToRefs(shows);
  const { genre, revealedGenre, isGridRevealed, expand, close } = useGenreView();

  useFrozenGenreLayout(genre);

  const hasAskedFromEmpty = ref(false);
  /** What the index and the grid held when the reader pressed; the page's report is the growth. */
  const pressedAt = ref<LoadedCounts | null>(null);
  const pagesAtPress = ref(0);
  const lastReport = ref<PageReport | null>(null);

  // Every loaded show of the genre, not the row's top 25: the grid pages through them.
  const gridShows = computed<readonly Show[]>(() => showsOfGenre(genre.value));

  const gridGenre = computed<Genre | null>(() => (gridShows.value.length > 0 ? genre.value : null));
  const isGridMode = computed(() => genre.value !== null);
  // A grid that grew out of the empty state is one the reader asked for, so it takes their focus.
  const isRevealedGrid = computed(() => isGridRevealed.value || hasAskedFromEmpty.value);
  const revealedRow = computed(() => revealedRowOf(revealedGenre.value));
  // Only the page a reader asked for is a wait; the background loop fills the index unasked.
  const isAwaitingPage = computed(() => pressedAt.value !== null);
  const pageReport = computed(() => lastReport.value);

  /** The next index page the grid has not asked for; the shows it brings render as they land. */
  function askForPage(): void {
    const before = countLoaded();

    void shows.loadMore();

    // The store takes a press by starting a page, or already has one on its way; one it had no
    // page for is nobody's wait, and it must not wipe the answer still on screen.
    if (!isLoadingMore.value) {
      return;
    }

    lastReport.value = null;
    pressedAt.value = before;
    pagesAtPress.value = pagesLoaded.value;
  }

  /** The empty state's own press: the grid it may bring is the reader's, so it arrives revealed. */
  function askFromEmpty(): void {
    hasAskedFromEmpty.value = true;
    askForPage();
  }

  function countLoaded(): LoadedCounts {
    return { loaded: showCount.value, inGenre: gridShows.value.length };
  }

  function reportGrowthSince(before: LoadedCounts): PageReport {
    const now = countLoaded();

    return { loaded: now.loaded - before.loaded, inGenre: now.inGenre - before.inGenre };
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

  // One press, one page: the wait ends on the page that lands, not on the loop that keeps going
  // past it, and on a loop that stops without one, because a failed page is an answer too.
  watch([pagesLoaded, isLoadingMore], ([pages, isLoading]) => {
    const before = pressedAt.value;

    if (before === null) {
      return;
    }

    if (isLoading && pages === pagesAtPress.value) {
      return;
    }

    lastReport.value = reportGrowthSince(before);
    pressedAt.value = null;
  });

  // A report belongs to the grid it answered; the next grid starts without one.
  watch(genre, () => {
    lastReport.value = null;
    pressedAt.value = null;
  });

  return {
    genre,
    revealedRow,
    gridGenre,
    gridShows,
    isGridMode,
    isRevealedGrid,
    isAwaitingPage,
    pageReport,
    expand,
    close,
    askForPage,
    askFromEmpty,
  };
}
