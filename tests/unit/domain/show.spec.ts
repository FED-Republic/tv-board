import { describe, expect, it } from 'vitest';
import type { Show } from '@/domain/show';
import { isShow, isShowId, toShowId } from '@/domain/show';
import { aShow } from '../components/builders';

/** A copy of a show without one field, the way a corrupt cache entry arrives. */
function without(show: Show, field: keyof Show): unknown {
  const stripped: Record<string, unknown> = { ...show };

  delete stripped[field];

  return stripped;
}

describe('isShowId', () => {
  describe('when the value is a positive integer', () => {
    it('given 1, when checked, then it is a show id', () => {
      expect(isShowId(1)).toBe(true);
    });

    it('given 169, when checked, then it is a show id', () => {
      expect(isShowId(169)).toBe(true);
    });
  });

  describe('when the number is out of range', () => {
    it('given 0, when checked, then it is not a show id', () => {
      expect(isShowId(0)).toBe(false);
    });

    it('given -1, when checked, then it is not a show id', () => {
      expect(isShowId(-1)).toBe(false);
    });

    it('given 1.5, when checked, then it is not a show id', () => {
      expect(isShowId(1.5)).toBe(false);
    });

    it('given NaN, when checked, then it is not a show id', () => {
      expect(isShowId(Number.NaN)).toBe(false);
    });

    it('given Infinity, when checked, then it is not a show id', () => {
      expect(isShowId(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });

  describe('when the value is not a number', () => {
    it('given the string "5", when checked, then it is not a show id', () => {
      expect(isShowId('5')).toBe(false);
    });

    it('given null, when checked, then it is not a show id', () => {
      expect(isShowId(null)).toBe(false);
    });

    it('given undefined, when checked, then it is not a show id', () => {
      expect(isShowId(undefined)).toBe(false);
    });
  });
});

describe('toShowId', () => {
  describe('when the number is a valid id', () => {
    it('given 169, when minted, then it keeps the same numeric value', () => {
      expect(toShowId(169)).toBe(169);
    });

    it('given 1, when minted, then it keeps the same numeric value', () => {
      expect(toShowId(1)).toBe(1);
    });
  });

  describe('when the number is not a valid id', () => {
    it('given -1, when minted, then it throws a RangeError', () => {
      expect(() => toShowId(-1)).toThrow(RangeError);
    });

    it('given -1, when minted, then the message names the rejected value', () => {
      expect(() => toShowId(-1)).toThrow('Invalid show id: -1');
    });

    it('given 0, when minted, then it throws a RangeError', () => {
      expect(() => toShowId(0)).toThrow(RangeError);
    });

    it('given 1.5, when minted, then the message names the rejected value', () => {
      expect(() => toShowId(1.5)).toThrow('Invalid show id: 1.5');
    });

    it('given NaN, when minted, then it throws a RangeError', () => {
      expect(() => toShowId(Number.NaN)).toThrow(RangeError);
    });
  });
});

describe('isShow', () => {
  describe('when the value has every field', () => {
    it('given a complete show, when checked, then it is a show', () => {
      expect(isShow(aShow())).toBe(true);
    });

    it('given a cached show carrying an original url too, when checked, then it is a show', () => {
      const detailPoster = { medium: 'https://a.test/m.jpg', original: 'https://a.test/o.jpg' };

      expect(isShow({ ...aShow(), poster: detailPoster })).toBe(true);
    });

    it('given a show with no rating, poster or premiere, when checked, then it is a show', () => {
      const sparseShow = aShow({ rating: null, poster: null, premiered: null });

      expect(isShow(sparseShow)).toBe(true);
    });

    it('given a show with no genres, when checked, then it is a show', () => {
      expect(isShow(aShow({ genres: [] }))).toBe(true);
    });
  });

  describe('when the value is not an object', () => {
    it('given null, when checked, then it is not a show', () => {
      expect(isShow(null)).toBe(false);
    });

    it('given a string, when checked, then it is not a show', () => {
      expect(isShow('Breaking Bad')).toBe(false);
    });

    it('given undefined, when checked, then it is not a show', () => {
      expect(isShow(undefined)).toBe(false);
    });
  });

  describe('when a field is missing or wrongly typed', () => {
    it('given a show without a name, when checked, then it is not a show', () => {
      expect(isShow(without(aShow(), 'name'))).toBe(false);
    });

    it('given a fractional id, when checked, then it is not a show', () => {
      expect(isShow({ ...aShow(), id: 1.5 })).toBe(false);
    });

    it('given a poster without its card url, when checked, then it is not a show', () => {
      const emptyPoster = { original: 'https://example.test/original.jpg' };

      expect(isShow({ ...aShow(), poster: emptyPoster })).toBe(false);
    });

    it('given a poster whose card url is a number, when checked, then it is not a show', () => {
      expect(isShow({ ...aShow(), poster: { medium: 42 } })).toBe(false);
    });

    it('given genres as a single string, when checked, then it is not a show', () => {
      expect(isShow({ ...aShow(), genres: 'Drama' })).toBe(false);
    });

    it('given a genre that is not a string, when checked, then it is not a show', () => {
      expect(isShow({ ...aShow(), genres: ['Drama', 42] })).toBe(false);
    });

    it('given a rating as a string, when checked, then it is not a show', () => {
      expect(isShow({ ...aShow(), rating: '9.3' })).toBe(false);
    });

    it('given a premiere date as a number, when checked, then it is not a show', () => {
      expect(isShow({ ...aShow(), premiered: 2008 })).toBe(false);
    });
  });
});
