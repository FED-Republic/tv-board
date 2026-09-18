import { vi } from 'vitest';

type ObservedCallback = (entries: IntersectionObserverEntry[]) => void;

export type IntersectionObserverStub = {
  /** Every element ever observed, across instances, in observation order. */
  readonly observed: readonly HTMLElement[];
  readonly lastOptions: IntersectionObserverInit | undefined;
  readonly intersect: (element: HTMLElement) => void;
  readonly isObserving: (element: HTMLElement) => boolean;
};

/** The two fields a viewport composable reads; the rest of the entry never matters here. */
const toEntry = (element: HTMLElement): IntersectionObserverEntry =>
  ({ isIntersecting: true, target: element }) as unknown as IntersectionObserverEntry;

/**
 * Replaces the global `IntersectionObserver` with one a spec can fire: the shim in
 * `tests/setup.ts` records nothing and never calls its callback.
 */
export function installIntersectionObserverStub(): IntersectionObserverStub {
  const instances: RecordingObserver[] = [];
  const everObserved: HTMLElement[] = [];
  // The owner survives `unobserve`, so a spec can fire a second time at a one-shot observer.
  const ownerOf = new Map<HTMLElement, RecordingObserver>();

  class RecordingObserver {
    readonly callback: ObservedCallback;
    readonly options: IntersectionObserverInit | undefined;
    readonly targets = new Set<HTMLElement>();

    constructor(callback: ObservedCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.options = options;
      instances.push(this);
    }

    observe(element: HTMLElement): void {
      this.targets.add(element);
      everObserved.push(element);
      ownerOf.set(element, this);
    }

    unobserve(element: HTMLElement): void {
      this.targets.delete(element);
    }

    disconnect(): void {
      this.targets.clear();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  function intersect(element: HTMLElement): void {
    const owner = ownerOf.get(element);

    if (owner === undefined) {
      throw new Error('intersect: no observer ever observed this element');
    }

    owner.callback([toEntry(element)]);
  }

  const isObserving = (element: HTMLElement): boolean =>
    instances.some((observer) => observer.targets.has(element));

  vi.stubGlobal('IntersectionObserver', RecordingObserver);

  return {
    get observed(): readonly HTMLElement[] {
      return [...everObserved];
    },
    get lastOptions(): IntersectionObserverInit | undefined {
      return instances.at(-1)?.options;
    },
    intersect,
    isObserving,
  };
}
