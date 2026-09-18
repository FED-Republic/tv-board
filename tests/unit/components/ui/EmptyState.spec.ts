import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import EmptyState from '@/components/ui/EmptyState.vue';

const PROPS = { heading: 'No bookmarks yet', body: 'Bookmark a show to find it here.' };

describe('EmptyState', () => {
  describe('when a collection is empty', () => {
    it('given a heading, when rendered, then the heading text is shown', () => {
      render(EmptyState, { props: PROPS });

      expect(screen.queryByText(PROPS.heading)).not.toBeNull();
    });

    it('given a heading, when rendered, then it is reachable as a level-2 heading', () => {
      render(EmptyState, { props: PROPS });

      expect(screen.getByRole('heading', { level: 2, name: PROPS.heading })).toBeDefined();
    });

    it('given a body, when rendered, then the body text is shown', () => {
      render(EmptyState, { props: PROPS });

      expect(screen.queryByText(PROPS.body)).not.toBeNull();
    });
  });

  describe('when the caller offers a way out', () => {
    it('given an action slot, when rendered, then the slot content is shown', () => {
      const action = { action: '<a href="/">Browse shows</a>' };

      render(EmptyState, { props: PROPS, slots: action });

      expect(screen.getByRole('link', { name: 'Browse shows' }).getAttribute('href')).toBe('/');
    });

    it('given no action slot, when rendered, then no action is shown', () => {
      render(EmptyState, { props: PROPS });

      expect(screen.queryByRole('link')).toBeNull();
    });
  });
});
