import { type ComputedRef, onWatcherCleanup, type Ref, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGenreFilter } from '@/composables/useGenreFilter';
import type { Genre } from '@/domain/genre';
import { INSTANT_SCROLL } from '@/lib/scroll-behavior';

const GENRE_PARAM = 'genre';

type GenreView = {
  readonly genre: ComputedRef<Genre | null>;
  readonly revealedGenre: Ref<Genre | null>;
  readonly isGridRevealed: Ref<boolean>;
  readonly expand: (genre: Genre) => Promise<void>;
  readonly close: () => Promise<void>;
};

/**
 * The dashboard's view of `?genre=`: a genre means its grid, none means every row. A grid or a
 * row counts as revealed only when the genre changed while the page was open, so a direct load
 * never moves focus or scrolls on its own. Expanding pushes a history entry, so Back closes the
 * grid; the close button goes back over that entry when it is there, so history stays clean.
 * Closing puts the page back at the offset the rows had when the grid opened and only then names
 * the revealed row, so the heading it focuses is on screen again. A grid opened by a link of its
 * own has no such offset: the page stays where it is and the revealed row brings itself on
 * screen.
 */
export function useGenreView(): GenreView {
  const route = useRoute();
  const router = useRouter();
  const { genre, setGenre } = useGenreFilter();
  const revealedGenre = ref<Genre | null>(null);
  const isGridRevealed = ref(false);
  const closingGenre = ref<Genre | null>(null);
  const rowsOffsetPx = ref<number | null>(null);

  const expand = (next: Genre): Promise<void> => setGenre(next, 'push');

  async function close(): Promise<void> {
    // A second click while the first close is still navigating would step back past the rows.
    if (genre.value === null || closingGenre.value !== null) {
      return;
    }

    closingGenre.value = genre.value;

    if (cameFromRows()) {
      router.back();
      return;
    }

    await setGenre(null);
  }

  /** Whether the previous history entry is this dashboard without a genre. */
  function cameFromRows(): boolean {
    const previous = router.options.history.state.back;

    if (typeof previous !== 'string') {
      return false;
    }

    const [path = '', query = ''] = previous.split('?');

    return path === route.path && !query.includes(`${GENRE_PARAM}=`);
  }

  /**
   * The offset is read before the page renders, while the rows still have it. Every way into the
   * grid comes through here — the expand button and the header's genre select — so every grid
   * opened from the rows can go back to them.
   */
  watch(genre, (next, previous) => {
    isGridRevealed.value = next !== null;

    if (next !== null) {
      revealedGenre.value = null;

      if (previous === null) {
        rowsOffsetPx.value = window.scrollY;
      }

      return;
    }

    if (closingGenre.value === null) {
      return;
    }

    showRowsAgain(closingGenre.value);
    closingGenre.value = null;
  });

  /**
   * On the next frame, because the page cannot take its old offset before the rows are back in
   * the document and a route change does not always render in the flush that reports it. The row
   * is named after the page has moved, so the heading it hands focus to is on screen. On the Back
   * path the router restores the same offset from the history entry, which was saved as this grid
   * opened.
   */
  function showRowsAgain(revealed: Genre): void {
    const frame = requestAnimationFrame(() => {
      restoreRowsOffset();
      revealedGenre.value = revealed;
    });

    // A page the reader has already left must not be dragged to the dashboard's offset.
    onWatcherCleanup(() => cancelAnimationFrame(frame));
  }

  /** A grid the reader opened from the rows knows where they were; a linked one does not. */
  function restoreRowsOffset(): void {
    const offsetPx = rowsOffsetPx.value;

    if (offsetPx === null) {
      return;
    }

    window.scrollTo({ top: offsetPx, behavior: INSTANT_SCROLL });
  }

  return { genre, revealedGenre, isGridRevealed, expand, close };
}
