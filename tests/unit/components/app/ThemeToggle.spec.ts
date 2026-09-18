import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import ThemeToggle from '@/components/app/ThemeToggle.vue';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Stubs `matchMedia` so the spec decides what the system colour scheme is. */
function stubSystemScheme(prefersDark: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === DARK_SCHEME_QUERY && prefersDark,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function renderToggleOn(prefersDark: boolean): void {
  stubSystemScheme(prefersDark);
  render(ThemeToggle);
}

const themeAttribute = (): string | null => document.documentElement.getAttribute('data-theme');

const pressToggle = (name: string): Promise<void> =>
  fireEvent.click(screen.getByRole('button', { name }));

describe('ThemeToggle', () => {
  describe('when the page is dark', () => {
    it('given a dark system scheme, when rendered, then the button offers the light theme', () => {
      renderToggleOn(true);

      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeDefined();
    });

    it('given a dark system scheme, when the toggle is pressed, then the page turns light', async () => {
      renderToggleOn(true);

      await pressToggle('Switch to light theme');

      expect(themeAttribute()).toBe('light');
    });

    it('given a dark system scheme, when the toggle is pressed, then it offers dark back', async () => {
      renderToggleOn(true);

      await pressToggle('Switch to light theme');

      expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeDefined();
    });
  });

  describe('when the page is light', () => {
    it('given a light system scheme, when rendered, then the button offers the dark theme', () => {
      renderToggleOn(false);

      expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeDefined();
    });

    it('given a light system scheme, when the toggle is pressed, then the page turns dark', async () => {
      renderToggleOn(false);

      await pressToggle('Switch to dark theme');

      expect(themeAttribute()).toBe('dark');
    });

    it('given a light system scheme, when the toggle is pressed, then it offers light back', async () => {
      renderToggleOn(false);

      await pressToggle('Switch to dark theme');

      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeDefined();
    });
  });
});
