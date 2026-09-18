import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { WatchSource } from 'vue';
import { nextTick, ref } from 'vue';
import { useAsyncResource } from '@/composables/useAsyncResource';
import { HttpError, NetworkError } from '@/domain/api-error';
import type { AsyncState } from '@/domain/async-state';
import type { LoadError } from '@/domain/load-error';
import { withSetup } from './with-setup';

const SHOW_URL = 'https://api.tvmaze.com/shows/169';

type LoadRun = {
  readonly signal: AbortSignal;
  readonly resolve: (value: string) => void;
  readonly reject: (reason: unknown) => void;
};

type TrackedLoad = {
  readonly load: (signal: AbortSignal) => Promise<string>;
  readonly runs: readonly LoadRun[];
};

const mountResource = <T>(
  source: WatchSource<unknown>,
  load: (signal: AbortSignal) => T | Promise<T>,
) => withSetup(() => useAsyncResource(source, load));

/** A `load` the spec settles by hand, so a late result can land after a newer run started. */
function trackedLoad(): TrackedLoad {
  const runs: LoadRun[] = [];
  const load = (signal: AbortSignal): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      runs.push({ signal, resolve, reject });
    });

  return { load, runs };
}

const dataOf = (state: AsyncState<string, LoadError>): string | null =>
  state.status === 'success' ? state.data : null;

const errorOf = (state: AsyncState<string, LoadError>): LoadError | null =>
  state.status === 'error' ? state.error : null;

describe('useAsyncResource', () => {
  describe('when the resource is first read', () => {
    it('given a source, when the host mounts, then the load runs once', () => {
      const { load, runs } = trackedLoad();

      mountResource(ref(1), load);

      expect(runs).toHaveLength(1);
    });

    it('given a load that returns a value, when the host mounts, then the state is already successful', () => {
      const { result } = mountResource(ref(1), () => 'from the index');

      expect(result.state.value).toEqual({ status: 'success', data: 'from the index' });
    });

    it('given a load that returns a promise, when the host mounts, then the state is loading', () => {
      const { load } = trackedLoad();

      const { result } = mountResource(ref(1), load);

      expect(result.state.value.status).toBe('loading');
    });

    it('given a pending load, when it resolves, then the state carries the data', async () => {
      const { load, runs } = trackedLoad();
      const { result } = mountResource(ref(1), load);

      runs[0]!.resolve('page one');
      await flushPromises();

      expect(dataOf(result.state.value)).toBe('page one');
    });
  });

  describe('when the source changes', () => {
    it('given a resource in flight, when the source changes, then the load runs again', async () => {
      const source = ref(1);
      const { load, runs } = trackedLoad();
      mountResource(source, load);

      source.value = 2;
      await nextTick();

      expect(runs).toHaveLength(2);
    });

    it('given a run in flight, when the source changes, then its signal is aborted', async () => {
      const source = ref(1);
      const { load, runs } = trackedLoad();
      mountResource(source, load);

      source.value = 2;
      await nextTick();

      expect(runs[0]!.signal.aborted).toBe(true);
    });

    it('given an aborted run, when its result lands late, then the newer result stands', async () => {
      const source = ref(1);
      const { load, runs } = trackedLoad();
      const { result } = mountResource(source, load);
      source.value = 2;
      await nextTick();

      runs[1]!.resolve('for the second source');
      runs[0]!.resolve('for the first source');
      await flushPromises();

      expect(dataOf(result.state.value)).toBe('for the second source');
    });
  });

  describe('when the load fails', () => {
    it('given a load that throws, when the host mounts, then the state carries that failure', () => {
      const failure = new HttpError(500, SHOW_URL);

      const { result } = mountResource(ref(1), () => {
        throw failure;
      });

      expect(errorOf(result.state.value)).toBe(failure);
    });

    it('given a rejection with a typed failure, when it settles, then the failure is kept', async () => {
      const failure = new HttpError(500, SHOW_URL);
      const { load, runs } = trackedLoad();
      const { result } = mountResource(ref(1), load);

      runs[0]!.reject(failure);
      await flushPromises();

      expect(errorOf(result.state.value)).toBe(failure);
    });

    it('given a rejection with an unknown reason, when it settles, then it reads as a network failure', async () => {
      const { load, runs } = trackedLoad();
      const { result } = mountResource(ref(1), load);

      runs[0]!.reject('something odd');
      await flushPromises();

      expect(errorOf(result.state.value)).toBeInstanceOf(NetworkError);
    });
  });

  describe('when the load is retried', () => {
    it('given a failed run, when retried and the load resolves, then the state carries the data', async () => {
      const { load, runs } = trackedLoad();
      const { result } = mountResource(ref(1), load);
      runs[0]!.reject(new HttpError(500, SHOW_URL));
      await flushPromises();

      const retried = result.retry();
      runs[1]!.resolve('second time lucky');
      await retried;

      expect(dataOf(result.state.value)).toBe('second time lucky');
    });
  });

  describe('when the scope is disposed', () => {
    it('given a run in flight, when the host unmounts, then its signal is aborted', () => {
      const { load, runs } = trackedLoad();
      const { unmount } = mountResource(ref(1), load);

      unmount();

      expect(runs[0]!.signal.aborted).toBe(true);
    });

    it('given a disposed scope, when the result lands, then the state stops changing', async () => {
      const { load, runs } = trackedLoad();
      const { result, unmount } = mountResource(ref(1), load);

      unmount();
      runs[0]!.resolve('too late');
      await flushPromises();

      expect(result.state.value.status).toBe('loading');
    });
  });
});
