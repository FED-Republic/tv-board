import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_BASE_URL = 'https://api.tvmaze.com';
const DEFAULT_INDEX_PAGE_COUNT = 5;

/** The config reads `import.meta.env` once, so every case needs a fresh module instance. */
function loadConfig() {
  vi.resetModules();

  return import('@/services/tvmaze/config');
}

beforeEach(() => vi.unstubAllEnvs());

afterEach(() => vi.unstubAllEnvs());

describe('TVMAZE_BASE_URL', () => {
  describe('when the environment variable is unset', () => {
    it('given no override, when the config loads, then the public TVmaze url is used', async () => {
      vi.stubEnv('VITE_TVMAZE_BASE_URL', undefined);

      const { TVMAZE_BASE_URL } = await loadConfig();

      expect(TVMAZE_BASE_URL).toBe(DEFAULT_BASE_URL);
    });
  });

  describe('when the environment variable is set', () => {
    it('given a proxy url, when the config loads, then that url is used', async () => {
      vi.stubEnv('VITE_TVMAZE_BASE_URL', 'https://tvmaze.test');

      const { TVMAZE_BASE_URL } = await loadConfig();

      expect(TVMAZE_BASE_URL).toBe('https://tvmaze.test');
    });
  });
});

describe('INDEX_PAGE_COUNT', () => {
  describe('when the environment variable is unset', () => {
    it('given no override, when the config loads, then five pages are loaded', async () => {
      vi.stubEnv('VITE_INDEX_PAGES', undefined);

      const { INDEX_PAGE_COUNT } = await loadConfig();

      expect(INDEX_PAGE_COUNT).toBe(DEFAULT_INDEX_PAGE_COUNT);
    });
  });

  describe('when the environment variable is a positive number', () => {
    it('given "2", when the config loads, then two pages are loaded', async () => {
      vi.stubEnv('VITE_INDEX_PAGES', '2');

      const { INDEX_PAGE_COUNT } = await loadConfig();

      expect(INDEX_PAGE_COUNT).toBe(2);
    });
  });

  describe('when the environment variable cannot be used', () => {
    it('given "abc", when the config loads, then it falls back to five pages', async () => {
      vi.stubEnv('VITE_INDEX_PAGES', 'abc');

      const { INDEX_PAGE_COUNT } = await loadConfig();

      expect(INDEX_PAGE_COUNT).toBe(DEFAULT_INDEX_PAGE_COUNT);
    });

    it('given an empty string, when the config loads, then it falls back to five pages', async () => {
      vi.stubEnv('VITE_INDEX_PAGES', '');

      const { INDEX_PAGE_COUNT } = await loadConfig();

      expect(INDEX_PAGE_COUNT).toBe(DEFAULT_INDEX_PAGE_COUNT);
    });

    it('given "0", when the config loads, then it falls back to five pages', async () => {
      vi.stubEnv('VITE_INDEX_PAGES', '0');

      const { INDEX_PAGE_COUNT } = await loadConfig();

      expect(INDEX_PAGE_COUNT).toBe(DEFAULT_INDEX_PAGE_COUNT);
    });

    it('given "-3", when the config loads, then it falls back to five pages', async () => {
      vi.stubEnv('VITE_INDEX_PAGES', '-3');

      const { INDEX_PAGE_COUNT } = await loadConfig();

      expect(INDEX_PAGE_COUNT).toBe(DEFAULT_INDEX_PAGE_COUNT);
    });
  });
});
