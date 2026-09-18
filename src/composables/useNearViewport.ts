import { type MaybeRefOrGetter, onWatcherCleanup, type Ref, ref, toValue, watch } from 'vue';

export type NearViewportOptions = {
  readonly rootMargin?: string;
  /** Read through `toValue`, so a block the page decides to mount later still mounts. */
  readonly eager?: MaybeRefOrGetter<boolean>;
};

type NearViewport = {
  readonly isNear: Ref<boolean>;
};

/** About one viewport ahead, so a block is ready before a normal scroll reaches it. */
export const NEAR_VIEWPORT_MARGIN = '600px 0px';

/**
 * Reports once when the target comes within `rootMargin` of the viewport, or as soon as `eager`
 * turns true; `isNear` never goes back to `false`, so content mounted on it stays mounted.
 */
export function useNearViewport(
  target: Ref<HTMLElement | null>,
  options: NearViewportOptions = {},
): NearViewport {
  const { rootMargin = NEAR_VIEWPORT_MARGIN, eager = false } = options;
  // Without an observer the block mounts at once: a permanent skeleton would be the worse failure.
  const isNear = ref(toValue(eager) || typeof IntersectionObserver !== 'function');

  function observe(element: HTMLElement): IntersectionObserver {
    const observer = new IntersectionObserver(
      (entries) => {
        const hasComeNear = entries.some((entry) => entry.isIntersecting);

        if (!hasComeNear) {
          return;
        }

        isNear.value = true;
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(element);

    return observer;
  }

  watch(
    [target, () => toValue(eager)],
    ([element, isEager]) => {
      if (isEager) {
        isNear.value = true;
      }

      if (isNear.value || element === null) {
        return;
      }

      const observer = observe(element);

      onWatcherCleanup(() => observer.disconnect());
    },
    { immediate: true },
  );

  return { isNear };
}
