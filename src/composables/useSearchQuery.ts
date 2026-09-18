import { computed, type ComputedRef, onScopeDispose, type Ref, ref, watch } from 'vue';
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router';

type SearchQuery = {
  /** The query in the URL, the one results are fetched for. */
  readonly query: ComputedRef<string>;
  /** The text in the field, ahead of the URL while the reader types. */
  readonly draft: Ref<string>;
  readonly setQuery: (value: string) => void;
};

export const SEARCH_DEBOUNCE_MS = 300;

const QUERY_PARAM = 'q';
const GENRE_PARAM = 'genre';

/**
 * The `?q=` search query. The field's text reaches the URL after a pause in typing, so a
 * keystroke is not a navigation. Typing navigates to the search page once and then replaces the
 * entry in place, so the back button leaves the search rather than retracing every keystroke.
 */
export function useSearchQuery(): SearchQuery {
  const route = useRoute();
  const router = useRouter();

  const query = computed(() => {
    const raw = route.query[QUERY_PARAM];

    return typeof raw === 'string' ? raw : '';
  });
  const draft = ref(query.value);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function setQuery(value: string): void {
    draft.value = value;
    cancelPendingWrite();
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void writeQuery(value.trim());
    }, SEARCH_DEBOUNCE_MS);
  }

  async function writeQuery(trimmed: string): Promise<void> {
    const isOnSearchPage = route.name === 'search';
    const genreQuery = genreParamOf(route.query);

    if (trimmed === '') {
      if (isOnSearchPage) {
        await router.push({ name: 'home', query: genreQuery });
      }

      return;
    }

    const target = { name: 'search', query: { ...genreQuery, [QUERY_PARAM]: trimmed } };

    if (isOnSearchPage) {
      await router.replace(target);
      return;
    }

    await router.push(target);
  }

  function cancelPendingWrite(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  // The URL is the source of truth, but the field keeps what was typed, spaces included; only a
  // navigation the field did not cause (Back, a shared link) replaces its text.
  watch(query, (value) => {
    if (value !== draft.value.trim()) {
      draft.value = value;
    }
  });

  // The header never unmounts, so a write pending when the reader opens another page would
  // fire there and drag them to the search page.
  watch(() => route.name, cancelPendingWrite);

  onScopeDispose(cancelPendingWrite);

  return { query, draft, setQuery };
}

function genreParamOf(query: LocationQueryRaw): LocationQueryRaw {
  const genre = query[GENRE_PARAM];

  return typeof genre === 'string' ? { [GENRE_PARAM]: genre } : {};
}
