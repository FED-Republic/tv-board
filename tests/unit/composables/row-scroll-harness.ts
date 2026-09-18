import { vi } from 'vitest';
import { ref } from 'vue';
import { useRowScroll } from '@/composables/useRowScroll';
import { withSetup } from './with-setup';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const VIEWPORT_WIDTH_PX = 300;
export const CONTENT_WIDTH_PX = 900;

export type Metrics = {
  readonly scrollLeft: number;
  readonly clientWidth: number;
  readonly scrollWidth: number;
};

/** Three pages: content is three viewports wide. */
export const DEFAULT_METRICS: Metrics = {
  scrollLeft: 0,
  clientWidth: VIEWPORT_WIDTH_PX,
  scrollWidth: CONTENT_WIDTH_PX,
};

export function defineMetric(element: HTMLElement, name: string, value: number): void {
  Object.defineProperty(element, name, { value, writable: true, configurable: true });
}

/** jsdom reports every box as zero; the row specs are the one place that supplies the metrics. */
export function aScroller(metrics: Metrics = DEFAULT_METRICS): HTMLElement {
  const element = document.createElement('div');

  defineMetric(element, 'clientWidth', metrics.clientWidth);
  defineMetric(element, 'scrollWidth', metrics.scrollWidth);
  defineMetric(element, 'scrollLeft', metrics.scrollLeft);
  document.body.append(element);

  return element;
}

/** A row one viewport wide holding `contentWidthPx` of cards. */
export const aRowWithContent = (contentWidthPx: number): HTMLElement =>
  aScroller({ scrollLeft: 0, clientWidth: VIEWPORT_WIDTH_PX, scrollWidth: contentWidthPx });

export function mountRowScroll(element: HTMLElement | null): ReturnType<typeof useRowScroll> {
  const scroller = ref<HTMLElement | null>(element);

  return withSetup(() => useRowScroll(scroller)).result;
}

/** A resize is coalesced through `requestAnimationFrame`; the row is measured on that frame. */
export const nextFrame = (): Promise<number> => new Promise(requestAnimationFrame);

export function stubReducedMotion(prefersReducedMotion: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === REDUCED_MOTION_QUERY && prefersReducedMotion,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}
