import { cleanup } from '@testing-library/vue';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// jsdom lacks these browser APIs. The shims are the minimum the app touches and are assigned, not
// stubbed with `vi.stubGlobal`, so a spec can stub over one for a case and `unstubGlobals` (in
// `vite.config.ts`) restores the shim, never a missing global.
function installBrowserShims(): void {
  window.requestIdleCallback = (callback: IdleRequestCallback): number =>
    window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
  window.cancelIdleCallback = (handle: number): void => window.clearTimeout(handle);
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
  window.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: readonly number[] = [];
    readonly scrollMargin = '';
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
  Element.prototype.scrollBy = () => undefined;
  Element.prototype.scrollTo = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
  // The router's `scrollBehavior` calls it after every navigation; jsdom only logs a warning.
  window.scrollTo = () => undefined;
}

beforeAll(() => {
  installBrowserShims();
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => server.close());
