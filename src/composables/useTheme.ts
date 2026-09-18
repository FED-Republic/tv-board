import { computed, type ComputedRef, onScopeDispose, ref } from 'vue';

export const THEME_STORAGE_KEY = 'tv-board.theme';

export type ThemePreference = 'system' | 'dark' | 'light';

type Theme = {
  readonly preference: ComputedRef<ThemePreference>;
  readonly isDark: ComputedRef<boolean>;
  readonly toggle: () => void;
};

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

// The choice is global (it lives on `<html>`), so every caller shares one pair of refs.
const preference = ref<ThemePreference>('system');
const systemPrefersDark = ref(false);

/**
 * The colour scheme choice. `system` leaves `color-scheme: dark light` to the browser; an
 * explicit choice sets `data-theme` on `<html>` and survives reloads through `localStorage`.
 */
export function useTheme(): Theme {
  const darkScheme = window.matchMedia(DARK_SCHEME_QUERY);

  const isDark = computed(() => {
    if (preference.value === 'system') {
      return systemPrefersDark.value;
    }

    return preference.value === 'dark';
  });

  function toggle(): void {
    const next: ThemePreference = isDark.value ? 'light' : 'dark';

    preference.value = next;
    applyPreference(next);
    writePreference(next);
  }

  function onSchemeChange(event: { readonly matches: boolean }): void {
    systemPrefersDark.value = event.matches;
  }

  preference.value = readPreference();
  systemPrefersDark.value = darkScheme.matches;
  applyPreference(preference.value);
  darkScheme.addEventListener('change', onSchemeChange);
  onScopeDispose(() => darkScheme.removeEventListener('change', onSchemeChange));

  return { preference: computed(() => preference.value), isDark, toggle };
}

function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement;

  if (preference === 'system') {
    root.removeAttribute('data-theme');
    return;
  }

  root.setAttribute('data-theme', preference);
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    return stored === 'dark' || stored === 'light' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function writePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // A blocked storage loses the choice on reload, never the current page.
  }
}
