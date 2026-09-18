import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from '@/composables/useTheme';
import { withSetup } from './with-setup';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

type ChangeListener = (event: { readonly matches: boolean }) => void;
type SystemScheme = { readonly setDark: (isDark: boolean) => void };

/** Stubs `matchMedia` so the spec can flip the system colour scheme and fire `change`. */
function stubSystemScheme(startsDark: boolean): SystemScheme {
  const listeners = new Set<ChangeListener>();
  let matches = startsDark;

  const darkQuery = {
    get matches(): boolean {
      return matches;
    },
    media: DARK_SCHEME_QUERY,
    addEventListener: (_type: 'change', listener: ChangeListener) => void listeners.add(listener),
    removeEventListener: (_type: 'change', listener: ChangeListener) =>
      void listeners.delete(listener),
  };

  const otherQuery = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });

  vi.stubGlobal('matchMedia', (query: string) =>
    query === DARK_SCHEME_QUERY ? darkQuery : otherQuery(query),
  );

  return {
    setDark: (isDark: boolean) => {
      matches = isDark;
      listeners.forEach((listener) => listener({ matches: isDark }));
    },
  };
}

const themeAttribute = (): string | null => document.documentElement.getAttribute('data-theme');

const storedPreference = (): string | null => localStorage.getItem(THEME_STORAGE_KEY);

function throwOnRead(): void {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage denied');
  });
}

function throwOnWrite(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded');
  });
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
  describe('when the preference is restored from storage', () => {
    it('given a stored "dark", when created, then the preference is dark', () => {
      stubSystemScheme(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      expect(withSetup(() => useTheme()).result.preference.value).toBe('dark');
    });

    it('given a stored "light", when created, then the preference is light', () => {
      stubSystemScheme(true);
      localStorage.setItem(THEME_STORAGE_KEY, 'light');

      expect(withSetup(() => useTheme()).result.preference.value).toBe('light');
    });

    it('given empty storage, when created, then the preference is system', () => {
      stubSystemScheme(false);

      expect(withSetup(() => useTheme()).result.preference.value).toBe('system');
    });

    it('given a stored "neon", when created, then the unknown value falls back to system', () => {
      stubSystemScheme(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'neon');

      expect(withSetup(() => useTheme()).result.preference.value).toBe('system');
    });

    it('given a throwing getItem, when created, then the preference is system', () => {
      stubSystemScheme(false);
      throwOnRead();

      expect(withSetup(() => useTheme()).result.preference.value).toBe('system');
    });
  });

  describe('when the preference is applied to the document', () => {
    it('given a stored "dark", when created, then the document theme is dark', () => {
      stubSystemScheme(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      withSetup(() => useTheme());

      expect(themeAttribute()).toBe('dark');
    });

    it('given no stored preference, when created, then the document carries no theme', () => {
      stubSystemScheme(true);
      document.documentElement.setAttribute('data-theme', 'light');

      withSetup(() => useTheme());

      expect(themeAttribute()).toBeNull();
    });
  });

  describe('when the system scheme decides', () => {
    it('given a system preference and a dark system, when read, then it is dark', () => {
      stubSystemScheme(true);

      expect(withSetup(() => useTheme()).result.isDark.value).toBe(true);
    });

    it('given a system preference and a light system, when read, then it is not dark', () => {
      stubSystemScheme(false);

      expect(withSetup(() => useTheme()).result.isDark.value).toBe(false);
    });

    it('given a system preference, when the media query changes, then isDark follows', async () => {
      const scheme = stubSystemScheme(false);
      const { isDark } = withSetup(() => useTheme()).result;

      scheme.setDark(true);
      await flushPromises();

      expect(isDark.value).toBe(true);
    });

    it('given an explicit "light", when the system turns dark, then isDark stays false', async () => {
      const scheme = stubSystemScheme(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      const { isDark } = withSetup(() => useTheme()).result;

      scheme.setDark(true);
      await flushPromises();

      expect(isDark.value).toBe(false);
    });

    it('given a disposed scope, when the media query changes, then isDark stops following', async () => {
      const scheme = stubSystemScheme(false);
      const { result, unmount } = withSetup(() => useTheme());

      unmount();
      scheme.setDark(true);
      await flushPromises();

      expect(result.isDark.value).toBe(false);
    });
  });

  describe('when a second caller reads the theme', () => {
    it('given two callers, when one toggles, then the other sees the new preference', () => {
      stubSystemScheme(false);
      const first = withSetup(() => useTheme()).result;
      const second = withSetup(() => useTheme()).result;

      first.toggle();

      expect(second.preference.value).toBe('dark');
    });

    it('given two callers, when one toggles, then the other reads as dark', () => {
      stubSystemScheme(false);
      const first = withSetup(() => useTheme()).result;
      const second = withSetup(() => useTheme()).result;

      first.toggle();

      expect(second.isDark.value).toBe(true);
    });

    it('given a preference stored after the first call, when a second one starts, then storage is read again', () => {
      stubSystemScheme(false);
      withSetup(() => useTheme());
      localStorage.setItem(THEME_STORAGE_KEY, 'light');

      const second = withSetup(() => useTheme()).result;

      expect(second.preference.value).toBe('light');
    });
  });

  describe('when the theme is toggled', () => {
    it('given a dark preference, when toggled, then the preference becomes light', () => {
      stubSystemScheme(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      const { preference, toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(preference.value).toBe('light');
    });

    it('given a light preference, when toggled, then the preference becomes dark', () => {
      stubSystemScheme(false);
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      const { preference, toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(preference.value).toBe('dark');
    });

    it('given a dark system and no preference, when toggled, then the preference becomes light', () => {
      stubSystemScheme(true);
      const { preference, toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(preference.value).toBe('light');
    });

    it('given a light system and no preference, when toggled, then the preference becomes dark', () => {
      stubSystemScheme(false);
      const { preference, toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(preference.value).toBe('dark');
    });

    it('given a light system, when toggled, then isDark turns true', () => {
      stubSystemScheme(false);
      const { isDark, toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(isDark.value).toBe(true);
    });

    it('given a light system, when toggled, then the choice is stored', () => {
      stubSystemScheme(false);
      const { toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(storedPreference()).toBe('dark');
    });

    it('given a light system, when toggled, then the document theme becomes dark', () => {
      stubSystemScheme(false);
      const { toggle } = withSetup(() => useTheme()).result;

      toggle();

      expect(themeAttribute()).toBe('dark');
    });

    it('given a throwing setItem, when toggled, then the preference still changes', () => {
      stubSystemScheme(false);
      const { preference, toggle } = withSetup(() => useTheme()).result;

      throwOnWrite();
      toggle();

      expect(preference.value).toBe('dark');
    });

    it('given a throwing setItem, when toggled, then nothing is thrown', () => {
      stubSystemScheme(false);
      const { toggle } = withSetup(() => useTheme()).result;

      throwOnWrite();

      expect(() => toggle()).not.toThrow();
    });
  });
});
