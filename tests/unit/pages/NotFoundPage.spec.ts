import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import NotFoundPage from '@/pages/NotFoundPage.vue';
import { createAppRouter } from '@/router';

async function renderPageAt(location: string): Promise<void> {
  const router = createAppRouter(createMemoryHistory());

  await router.push(location);
  await router.isReady();
  render(NotFoundPage, { global: { plugins: [router] } });
}

describe('NotFoundPage', () => {
  describe('when an unknown route is opened', () => {
    it('given any unknown path, when rendered, then it names the problem', async () => {
      await renderPageAt('/nowhere');

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found');
    });

    it('given any unknown path, when rendered, then it links back to the dashboard', async () => {
      await renderPageAt('/nowhere');

      const link = screen.getByRole('link', { name: 'Back to the dashboard' });

      expect(link.getAttribute('href')).toBe('/');
    });
  });
});
