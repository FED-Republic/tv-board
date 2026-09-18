import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TVMAZE_BASE_URL } from '@/services/tvmaze/config';
import { INDEX_CACHE_KEY } from '@/stores/shows-cache';

const API_ORIGIN = new URL(TVMAZE_BASE_URL).origin;
const IMAGE_ORIGIN = 'https://static.tvmaze.com';
const FIRST_INDEX_PAGE_URL = `${TVMAZE_BASE_URL}/shows?page=0`;
const PRELOAD_SELECTOR = 'link[rel="preload"]';
const DASHBOARD_PATH = '/';
const DETAIL_PATH = '/shows/1';

// The shell is not built from `src/`, so the spec reads the shipped file: its hard-coded hosts
// must keep matching the configured base URL and the index cache key the dashboard reads.
const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const indexDocument = new DOMParser().parseFromString(indexHtml, 'text/html');

function preconnectHrefs(): readonly (string | null)[] {
  const links = indexDocument.querySelectorAll('link[rel="preconnect"]');

  return Array.from(links, (link) => link.getAttribute('href'));
}

function preconnectLink(href: string): Element | null {
  return indexDocument.querySelector(`link[rel="preconnect"][href="${href}"]`);
}

function appendedPreloadLinks(): readonly HTMLLinkElement[] {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>(PRELOAD_SELECTOR));
}

function visit(path: string): void {
  window.history.pushState({}, '', path);
}

function inlineShellScript(): string {
  const body = indexDocument.querySelector('script:not([src])')?.textContent;

  if (body === null || body === undefined) {
    throw new Error('index.html no longer holds an inline script');
  }

  return body;
}

/** DOMParser never runs the inline script, so the test window executes its body itself. */
function runInlineShellScript(): void {
  new Function(inlineShellScript())();
}

/** The value the shell declares for a storage key, so a drift from the store names itself. */
function declaredShellKey(name: string): string | null {
  const declaration = new RegExp(`const ${name} = '([^']+)'`).exec(inlineShellScript());

  return declaration?.[1] ?? null;
}

afterEach(() => {
  appendedPreloadLinks().forEach((link) => link.remove());
  sessionStorage.clear();
  visit(DASHBOARD_PATH);
});

describe('index.html preconnect hints', () => {
  describe('when the head is parsed', () => {
    it('given index.html, when the preconnect hrefs are read, then they are the TVmaze API and image origins', () => {
      expect(preconnectHrefs()).toEqual([API_ORIGIN, IMAGE_ORIGIN]);
    });

    it('given the API preconnect, when its attributes are read, then it opts into CORS', () => {
      expect(preconnectLink(API_ORIGIN)?.hasAttribute('crossorigin')).toBe(true);
    });

    it('given the image preconnect, when its attributes are read, then it carries no crossorigin', () => {
      expect(preconnectLink(IMAGE_ORIGIN)?.hasAttribute('crossorigin')).toBe(false);
    });
  });
});

describe('index.html cache keys', () => {
  describe('when the inline script is read', () => {
    it('given the shell script, when its index cache key is read, then it is the key the store reads', () => {
      expect(declaredShellKey('INDEX_CACHE_KEY')).toBe(INDEX_CACHE_KEY);
    });
  });
});

describe('index.html index preload', () => {
  describe('when the dashboard loads without a cached index', () => {
    it('given / and an empty session cache, when the inline script runs, then one fetch preload is appended', () => {
      visit(DASHBOARD_PATH);

      runInlineShellScript();

      expect(appendedPreloadLinks()).toHaveLength(1);
    });

    it('given / and an empty session cache, when the inline script runs, then the preload requests the configured first index page', () => {
      visit(DASHBOARD_PATH);

      runInlineShellScript();

      expect(appendedPreloadLinks()[0]?.getAttribute('href')).toBe(FIRST_INDEX_PAGE_URL);
    });

    it('given / and an empty session cache, when the inline script runs, then the preload is declared as a fetch', () => {
      visit(DASHBOARD_PATH);

      runInlineShellScript();

      expect(appendedPreloadLinks()[0]?.getAttribute('as')).toBe('fetch');
    });

    it('given / and an empty session cache, when the inline script runs, then the preload is fetched anonymously', () => {
      visit(DASHBOARD_PATH);

      runInlineShellScript();

      expect(appendedPreloadLinks()[0]?.getAttribute('crossorigin')).toBe('anonymous');
    });
  });

  describe('when the index is already in the session cache', () => {
    it('given a cached index on /, when the inline script runs, then no preload is appended', () => {
      visit(DASHBOARD_PATH);
      sessionStorage.setItem(INDEX_CACHE_KEY, '{"shows":[]}');

      runInlineShellScript();

      expect(appendedPreloadLinks()).toEqual([]);
    });
  });

  describe('when a route other than the dashboard loads', () => {
    it('given /shows/1 and an empty session cache, when the inline script runs, then no preload is appended', () => {
      visit(DETAIL_PATH);

      runInlineShellScript();

      expect(appendedPreloadLinks()).toEqual([]);
    });
  });
});
