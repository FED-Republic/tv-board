import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useAsyncResource } from '@/composables/useAsyncResource';
import type { AsyncState } from '@/domain/async-state';
import type { LoadError } from '@/domain/load-error';
import { NotFoundError } from '@/domain/not-found-error';
import type { ShowDetail, ShowId } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';

type ShowDetailResource = {
  readonly show: ComputedRef<AsyncState<ShowDetail, LoadError>>;
  readonly isNotFound: ComputedRef<boolean>;
  readonly retry: () => Promise<void>;
};

type DetailSource = Pick<ReturnType<typeof useShowsStore>, 'getShowDetailById' | 'loadShowDetail'>;

/** One show for the detail page: from the session's details when seen, else `GET /shows/:id`. */
export function useShowDetail(id: MaybeRefOrGetter<ShowId | null>): ShowDetailResource {
  const showsStore = useShowsStore();

  const { state: show, retry } = useAsyncResource(
    () => toValue(id),
    (signal) => loadDetail(showsStore, toValue(id), signal),
  );
  const isNotFound = computed(
    () => show.value.status === 'error' && show.value.error instanceof NotFoundError,
  );

  return { show, isNotFound, retry };
}

function loadDetail(
  source: DetailSource,
  showId: ShowId | null,
  signal: AbortSignal,
): ShowDetail | Promise<ShowDetail> {
  if (showId === null) {
    throw new NotFoundError('Invalid show id');
  }

  return source.getShowDetailById(showId) ?? source.loadShowDetail(showId, signal);
}
