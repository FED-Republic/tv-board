import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import AppNav from '@/components/app/AppNav.vue';
import { createComponentRouter } from '../builders';

async function renderNavAt(location: string): Promise<void> {
  const router = await createComponentRouter(location);

  render(AppNav, { global: { plugins: [router] } });
}

describe('AppNav', () => {
  describe('when the dashboard is open', () => {
    it('given the home route, when rendered, then Bookmarked is reachable', async () => {
      await renderNavAt('/');

      expect(screen.getByRole('link', { name: 'Bookmarked' }).getAttribute('href')).toBe(
        '/bookmarked',
      );
    });

    it('given the home route, when rendered, then Liked is reachable', async () => {
      await renderNavAt('/');

      expect(screen.getByRole('link', { name: 'Liked' }).getAttribute('href')).toBe('/liked');
    });

    it('given the home route, when rendered, then All Genres stays in the navigation', async () => {
      await renderNavAt('/');

      expect(screen.getByRole('link', { name: 'All Genres' }).getAttribute('href')).toBe('/');
    });

    it('given the home route, when rendered, then All Genres is the current page', async () => {
      await renderNavAt('/');

      expect(screen.getByRole('link', { name: 'All Genres' }).getAttribute('aria-current')).toBe(
        'page',
      );
    });
  });

  describe('when a saved-shows page is open', () => {
    it('given the bookmarked route, when rendered, then All Genres leads home', async () => {
      await renderNavAt('/bookmarked');

      expect(screen.getByRole('link', { name: 'All Genres' }).getAttribute('href')).toBe('/');
    });

    it('given the bookmarked route, when rendered, then Bookmarked is the current page', async () => {
      await renderNavAt('/bookmarked');

      expect(screen.getByRole('link', { name: 'Bookmarked' }).getAttribute('aria-current')).toBe(
        'page',
      );
    });

    it('given the bookmarked route, when rendered, then Liked is not the current page', async () => {
      await renderNavAt('/bookmarked');

      expect(screen.getByRole('link', { name: 'Liked' }).hasAttribute('aria-current')).toBe(false);
    });
  });

  describe('when the navigation is exposed to assistive technology', () => {
    it('given any route, when rendered, then the navigation carries a name', async () => {
      await renderNavAt('/');

      expect(screen.getByRole('navigation', { name: 'Main' })).toBeDefined();
    });
  });
});
