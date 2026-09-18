import { describe, expect, it } from 'vitest';
import { formatRating, ratingBarFraction } from '@/domain/rating';

describe('formatRating', () => {
  describe('when the rating already has one decimal', () => {
    it('given 9.3, when formatted, then it reads 9.3', () => {
      expect(formatRating(9.3)).toBe('9.3');
    });

    it('given 10, when formatted, then it reads 10.0', () => {
      expect(formatRating(10)).toBe('10.0');
    });
  });

  describe('when the rating needs padding or rounding', () => {
    it('given the whole number 9, when formatted, then the decimal is padded to 9.0', () => {
      expect(formatRating(9)).toBe('9.0');
    });

    it('given 7.25, when formatted, then it rounds up to 7.3', () => {
      expect(formatRating(7.25)).toBe('7.3');
    });

    it('given 7.24, when formatted, then it rounds down to 7.2', () => {
      expect(formatRating(7.24)).toBe('7.2');
    });

    it('given 0, when formatted, then it reads 0.0', () => {
      expect(formatRating(0)).toBe('0.0');
    });
  });
});

describe('ratingBarFraction', () => {
  describe('when the show has a rating inside the visible range', () => {
    it('given 5, when measured, then the bar is empty', () => {
      expect(ratingBarFraction(5)).toBe(0);
    });

    it('given 7.5, when measured, then the bar is half full', () => {
      expect(ratingBarFraction(7.5)).toBeCloseTo(0.5);
    });

    it('given 10, when measured, then the bar is full', () => {
      expect(ratingBarFraction(10)).toBe(1);
    });

    it('given 6, when measured, then the bar is one fifth full', () => {
      expect(ratingBarFraction(6)).toBeCloseTo(0.2);
    });
  });

  describe('when the rating falls outside the visible range', () => {
    it('given 3, when measured, then the bar is clamped to empty', () => {
      expect(ratingBarFraction(3)).toBe(0);
    });

    it('given 12, when measured, then the bar is clamped to full', () => {
      expect(ratingBarFraction(12)).toBe(1);
    });
  });

  describe('when the show is unrated', () => {
    it('given null, when measured, then the bar is empty', () => {
      expect(ratingBarFraction(null)).toBe(0);
    });
  });
});
