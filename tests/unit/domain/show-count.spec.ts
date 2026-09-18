import { describe, expect, it } from 'vitest';
import { describeRowCount, describeShowCount } from '@/domain/show-count';

describe('describeShowCount', () => {
  describe('when exactly one show is counted', () => {
    it('given 1, when described, then the noun is singular', () => {
      expect(describeShowCount(1)).toBe('1 show');
    });
  });

  describe('when the count is not one', () => {
    it('given 0, when described, then the noun is plural', () => {
      expect(describeShowCount(0)).toBe('0 shows');
    });

    it('given 12, when described, then the noun is plural', () => {
      expect(describeShowCount(12)).toBe('12 shows');
    });
  });
});

describe('describeRowCount', () => {
  describe('when the row shows every loaded show', () => {
    it('given 12 of 12, when described, then it reads as a plain count', () => {
      expect(describeRowCount(25, 12)).toBe('12 shows');
    });

    it('given exactly the limit, when described, then it reads as a plain count', () => {
      expect(describeRowCount(25, 25)).toBe('25 shows');
    });

    it('given a single show, when described, then the noun is singular', () => {
      expect(describeRowCount(25, 1)).toBe('1 show');
    });

    it('given nothing loaded, when described, then it reads as an empty count', () => {
      expect(describeRowCount(25, 0)).toBe('0 shows');
    });
  });

  describe('when the limit cut the row short', () => {
    it('given 25 of 84, when described, then it names both numbers', () => {
      expect(describeRowCount(25, 84)).toBe('Top 25 of 84 loaded shows');
    });

    it('given one more show than shown, when described, then it still names both numbers', () => {
      expect(describeRowCount(25, 26)).toBe('Top 25 of 26 loaded shows');
    });
  });
});
