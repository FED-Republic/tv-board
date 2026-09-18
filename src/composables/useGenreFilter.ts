import { computed, type ComputedRef } from 'vue';
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router';
import { type Genre, isGenre } from '@/domain/genre';

type HistoryMode = 'replace' | 'push';

type GenreFilter = {
  readonly genre: ComputedRef<Genre | null>;
  readonly setGenre: (genre: Genre | null, mode?: HistoryMode) => Promise<void>;
};

const GENRE_PARAM = 'genre';

/** The `?genre=` filter. The URL is the only source of truth, so it survives reload and sharing. */
export function useGenreFilter(): GenreFilter {
  const route = useRoute();
  const router = useRouter();

  const genre = computed<Genre | null>(() => {
    const raw = route.query[GENRE_PARAM];

    return isGenre(raw) ? raw : null;
  });

  /** A filter change replaces the entry; a `push` makes the change something Back undoes. */
  async function setGenre(next: Genre | null, mode: HistoryMode = 'replace'): Promise<void> {
    const rest = withoutParam(route.query, GENRE_PARAM);
    const query = next === null ? rest : { ...rest, [GENRE_PARAM]: next };

    if (mode === 'push') {
      await router.push({ query });
      return;
    }

    await router.replace({ query });
  }

  return { genre, setGenre };
}

function withoutParam(query: LocationQueryRaw, param: string): LocationQueryRaw {
  return Object.fromEntries(Object.entries(query).filter(([key]) => key !== param));
}
