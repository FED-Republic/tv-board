import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, type Ref, ref } from 'vue';
import {
  NEAR_VIEWPORT_MARGIN,
  type NearViewportOptions,
  useNearViewport,
} from '@/composables/useNearViewport';
import {
  installIntersectionObserverStub,
  type IntersectionObserverStub,
} from './intersection-observer-stub';
import { withSetup } from './with-setup';

const WIDE_MARGIN = '1200px 0px';

type Harness = {
  readonly target: Ref<HTMLElement | null>;
  readonly isNear: Ref<boolean>;
  readonly unmount: () => void;
};

function mountNearViewport(
  element: HTMLElement | null,
  options: NearViewportOptions = {},
): Harness {
  const target = ref<HTMLElement | null>(element);
  const { result, unmount } = withSetup(() => useNearViewport(target, options));

  return { target, isNear: result.isNear, unmount };
}

const aRow = (): HTMLElement => document.createElement('div');

let observer: IntersectionObserverStub;

beforeEach(() => {
  observer = installIntersectionObserverStub();
});

describe('useNearViewport', () => {
  describe('when the browser has no observer', () => {
    it('given no IntersectionObserver, when mounted, then the target counts as near at once', () => {
      vi.stubGlobal('IntersectionObserver', undefined);

      const { isNear } = mountNearViewport(aRow());

      expect(isNear.value).toBe(true);
    });
  });

  describe('when the caller asks for the content at once', () => {
    it('given eager, when mounted, then the target counts as near', () => {
      const { isNear } = mountNearViewport(aRow(), { eager: true });

      expect(isNear.value).toBe(true);
    });

    it('given eager, when mounted, then nothing is observed', () => {
      mountNearViewport(aRow(), { eager: true });

      expect(observer.observed).toEqual([]);
    });
  });

  describe('when the caller turns the block eager after mount', () => {
    it('given an observed target, when eager turns true, then it counts as near', async () => {
      const isEager = ref(false);
      const { isNear } = mountNearViewport(aRow(), { eager: () => isEager.value });

      isEager.value = true;
      await nextTick();

      expect(isNear.value).toBe(true);
    });

    it('given an observed target, when eager turns true, then observation stops', async () => {
      const row = aRow();
      const isEager = ref(false);
      mountNearViewport(row, { eager: () => isEager.value });

      isEager.value = true;
      await nextTick();

      expect(observer.isObserving(row)).toBe(false);
    });
  });

  describe('when the target is still far away', () => {
    it('given a target, when mounted, then it does not count as near', () => {
      const { isNear } = mountNearViewport(aRow());

      expect(isNear.value).toBe(false);
    });

    it('given a target, when mounted, then it is observed', () => {
      const row = aRow();

      mountNearViewport(row);

      expect(observer.isObserving(row)).toBe(true);
    });

    it('given no root margin, when mounted, then the default margin is used', () => {
      mountNearViewport(aRow());

      expect(observer.lastOptions?.rootMargin).toBe(NEAR_VIEWPORT_MARGIN);
    });

    it('given a root margin, when mounted, then that margin is used', () => {
      mountNearViewport(aRow(), { rootMargin: WIDE_MARGIN });

      expect(observer.lastOptions?.rootMargin).toBe(WIDE_MARGIN);
    });
  });

  describe('when the target comes near', () => {
    it('given an observed target, when it intersects, then it counts as near', () => {
      const row = aRow();
      const { isNear } = mountNearViewport(row);

      observer.intersect(row);

      expect(isNear.value).toBe(true);
    });

    it('given an observed target, when it intersects, then observation stops', () => {
      const row = aRow();

      mountNearViewport(row);
      observer.intersect(row);

      expect(observer.isObserving(row)).toBe(false);
    });

    it('given a target already near, when it intersects again, then it stays near', () => {
      const row = aRow();
      const { isNear } = mountNearViewport(row);

      observer.intersect(row);
      observer.intersect(row);

      expect(isNear.value).toBe(true);
    });
  });

  describe('when there is no target', () => {
    it('given a null target, when mounted, then nothing is observed', () => {
      mountNearViewport(null);

      expect(observer.observed).toEqual([]);
    });

    it('given a null target, when mounted, then it does not count as near', () => {
      const { isNear } = mountNearViewport(null);

      expect(isNear.value).toBe(false);
    });
  });

  describe('when the target is replaced', () => {
    it('given a new element, when the ref changes, then the old one is dropped', async () => {
      const first = aRow();
      const { target } = mountNearViewport(first);

      target.value = aRow();
      await nextTick();

      expect(observer.isObserving(first)).toBe(false);
    });

    it('given a new element, when the ref changes, then the new one is observed', async () => {
      const second = aRow();
      const { target } = mountNearViewport(aRow());

      target.value = second;
      await nextTick();

      expect(observer.isObserving(second)).toBe(true);
    });
  });

  describe('when the host goes away', () => {
    it('given an observed target, when the host unmounts, then observation stops', () => {
      const row = aRow();
      const { unmount } = mountNearViewport(row);

      unmount();

      expect(observer.isObserving(row)).toBe(false);
    });
  });
});
