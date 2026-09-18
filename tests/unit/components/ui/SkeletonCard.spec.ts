import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import { TEST_IDS } from '@/testing/test-ids';

describe('SkeletonCard', () => {
  describe('when a card is still loading', () => {
    it('given a placeholder, when rendered, then it is hidden from assistive technology', () => {
      render(SkeletonCard);

      expect(screen.getByTestId(TEST_IDS.skeletonCard).getAttribute('aria-hidden')).toBe('true');
    });

    it('given a placeholder, when rendered, then it announces no text', () => {
      render(SkeletonCard);

      expect(screen.getByTestId(TEST_IDS.skeletonCard).textContent).toBe('');
    });
  });
});
