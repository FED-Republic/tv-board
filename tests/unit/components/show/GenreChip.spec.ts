import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import GenreChip from '@/components/show/GenreChip.vue';
import { TEST_IDS } from '@/testing/test-ids';

describe('GenreChip', () => {
  describe('when a genre is listed', () => {
    it('given a label, when rendered, then the label text is shown', () => {
      render(GenreChip, { props: { label: 'Science-Fiction' } });

      expect(screen.getByTestId(TEST_IDS.genreChip).textContent).toBe('Science-Fiction');
    });

    it('given another label, when rendered, then that text is shown instead', () => {
      render(GenreChip, { props: { label: 'Drama' } });

      expect(screen.queryByText('Drama')).not.toBeNull();
    });
  });
});
