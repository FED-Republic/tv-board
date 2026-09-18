import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import RatingMark from '@/components/show/RatingMark.vue';
import { TEST_IDS } from '@/testing/test-ids';

/** What the mark contributes to a name: the hidden lead-in included, whitespace collapsed. */
const markText = () =>
  screen.getByTestId(TEST_IDS.ratingMark).textContent?.replace(/\s+/g, ' ').trim();

describe('RatingMark', () => {
  describe('when the show is rated', () => {
    it('given a rating of 9.3, when rendered, then it reads 9.3', () => {
      render(RatingMark, { props: { rating: 9.3 } });

      expect(markText()).toBe('9.3');
    });

    it('given a whole rating of 9, when rendered, then it keeps one decimal', () => {
      render(RatingMark, { props: { rating: 9 } });

      expect(markText()).toBe('9.0');
    });
  });

  describe('when the show has no rating', () => {
    it('given a null rating, when rendered, then it reads Not rated', () => {
      render(RatingMark, { props: { rating: null } });

      expect(markText()).toBe('Not rated');
    });

    it('given a null rating and a custom label, when rendered, then the label is used', () => {
      render(RatingMark, { props: { rating: null, unratedLabel: 'Not rated yet' } });

      expect(markText()).toBe('Not rated yet');
    });
  });

  describe('when a lead-in is given', () => {
    it('given a rating of 9.2 and a lead-in, when rendered, then it reads , rated 9.2', () => {
      render(RatingMark, { props: { rating: 9.2, leadIn: ', rated' } });

      expect(markText()).toBe(', rated 9.2');
    });

    it('given a null rating and a lead-in, when rendered, then it reads , Not rated', () => {
      render(RatingMark, { props: { rating: null, leadIn: ',' } });

      expect(markText()).toBe(', Not rated');
    });

    it('given a custom label and a lead-in, when rendered, then the label is unchanged', () => {
      render(RatingMark, { props: { rating: null, unratedLabel: 'Not rated yet', leadIn: ',' } });

      expect(markText()).toBe(', Not rated yet');
    });
  });

  describe('when no lead-in is given', () => {
    it('given a rating and no lead-in prop, when rendered, then nothing precedes the label', () => {
      render(RatingMark, { props: { rating: 9.2 } });

      expect(markText()).toBe('9.2');
    });

    it('given a rating and an empty lead-in, when rendered, then nothing precedes the label', () => {
      render(RatingMark, { props: { rating: 9.2, leadIn: '' } });

      expect(markText()).toBe('9.2');
    });
  });
});
