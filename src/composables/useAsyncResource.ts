import {
  computed,
  type ComputedRef,
  onScopeDispose,
  shallowRef,
  watch,
  type WatchSource,
} from 'vue';
import { type AsyncState, error, idle, loading, success } from '@/domain/async-state';
import { type LoadError, toLoadError } from '@/domain/load-error';

type AsyncResource<T> = {
  readonly state: ComputedRef<AsyncState<T, LoadError>>;
  readonly retry: () => Promise<void>;
};

/**
 * One `AsyncState` behind a `load` that runs again whenever `source` changes. The previous run
 * is aborted, a late result never overwrites a newer one, and leaving the scope cancels the last
 * run. A `load` that returns a value instead of a promise settles at once, with no loading state.
 */
export function useAsyncResource<T>(
  source: WatchSource<unknown>,
  load: (signal: AbortSignal) => T | Promise<T>,
): AsyncResource<T> {
  const state = shallowRef<AsyncState<T, LoadError>>(idle());

  let controller: AbortController | null = null;

  async function run(): Promise<void> {
    controller?.abort();
    controller = new AbortController();

    const { signal } = controller;

    try {
      const result = load(signal);

      if (!(result instanceof Promise)) {
        state.value = success(result);
        return;
      }

      state.value = loading();

      const data = await result;

      if (!signal.aborted) {
        state.value = success(data);
      }
    } catch (reason) {
      if (!signal.aborted) {
        state.value = error(toLoadError(reason));
      }
    }
  }

  watch(
    source,
    () => {
      void run();
    },
    { immediate: true },
  );

  onScopeDispose(() => controller?.abort());

  return { state: computed(() => state.value), retry: run };
}
