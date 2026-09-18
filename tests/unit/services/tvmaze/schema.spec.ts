import { describe, expect, it } from 'vitest';
import {
  listSchema,
  searchResultSchema,
  showListItemSchema,
  showSchema,
} from '@/services/tvmaze/schema';
import searchFleabagResults from '../../../resources/search-fleabag.2026-09-16.json';
import breakingBadShow from '../../../resources/show-169.2026-09-16.json';
import showsPageZero from '../../../resources/shows-page-0.2026-09-16.json';

const SHOWS_ON_PAGE_ZERO = 240;
const FIRST_PAGE_ITEM = showsPageZero[0];
const FLEABAG_RESULT = searchFleabagResults[0];

/** The captured show without one key, to prove which schema still accepts it. */
function showWithout(field: string): unknown {
  const stripped: Record<string, unknown> = structuredClone(breakingBadShow);
  delete stripped[field];

  return stripped;
}

describe('showListItemSchema', () => {
  describe('when the payload is a captured list item', () => {
    it('given the first show of page 0, when parsed, then it succeeds', () => {
      const result = showListItemSchema.safeParse(FIRST_PAGE_ITEM);

      expect(result.success).toBe(true);
    });

    it('given every show of page 0, when parsed, then each one succeeds', () => {
      const parsed = showsPageZero.filter((item) => showListItemSchema.safeParse(item).success);

      expect(parsed).toHaveLength(SHOWS_ON_PAGE_ZERO);
    });

    it('given the captured detail payload, when parsed, then it succeeds as a list item too', () => {
      const result = showListItemSchema.safeParse(breakingBadShow);

      expect(result.success).toBe(true);
    });
  });

  describe('when a list field is missing or wrongly typed', () => {
    it('given a show without a name, when parsed, then it fails', () => {
      const result = showListItemSchema.safeParse(showWithout('name'));

      expect(result.success).toBe(false);
    });

    it('given a rating average as a string, when parsed, then it fails', () => {
      const result = showListItemSchema.safeParse({
        ...breakingBadShow,
        rating: { average: '9.2' },
      });

      expect(result.success).toBe(false);
    });

    it('given an id of zero, when parsed, then it fails', () => {
      const result = showListItemSchema.safeParse({ ...breakingBadShow, id: 0 });

      expect(result.success).toBe(false);
    });

    it('given an image with no urls at all, when parsed, then it fails', () => {
      const result = showListItemSchema.safeParse({ ...breakingBadShow, image: {} });

      expect(result.success).toBe(false);
    });

    it('given a medium url that is not a url, when parsed, then it fails', () => {
      const image = { ...breakingBadShow.image, medium: 'not-a-url' };
      const result = showListItemSchema.safeParse({ ...breakingBadShow, image });

      expect(result.success).toBe(false);
    });
  });

  describe('when a field no list view reads is missing', () => {
    it('given a show without a weight, when parsed, then it still succeeds', () => {
      const result = showListItemSchema.safeParse(showWithout('weight'));

      expect(result.success).toBe(true);
    });

    it('given an image with only a medium url, when parsed, then it succeeds', () => {
      const image = { medium: breakingBadShow.image.medium };
      const result = showListItemSchema.safeParse({ ...breakingBadShow, image });

      expect(result.success).toBe(true);
    });

    it('given the captured image, when parsed, then the original url is stripped', () => {
      const result = showListItemSchema.safeParse(breakingBadShow);

      expect(result.data?.image).toEqual({ medium: breakingBadShow.image.medium });
    });
  });

  describe('when a detail field is missing', () => {
    it('given a show without a summary, when parsed, then it still succeeds', () => {
      const result = showListItemSchema.safeParse(showWithout('summary'));

      expect(result.success).toBe(true);
    });

    it('given a show without a status, when parsed, then it still succeeds', () => {
      const result = showListItemSchema.safeParse(showWithout('status'));

      expect(result.success).toBe(true);
    });
  });

  describe('when a nullable list field is null', () => {
    it('given no image, when parsed, then it succeeds', () => {
      const result = showListItemSchema.safeParse({ ...breakingBadShow, image: null });

      expect(result.success).toBe(true);
    });

    it('given no rating, when parsed, then it succeeds', () => {
      const result = showListItemSchema.safeParse({
        ...breakingBadShow,
        rating: { average: null },
      });

      expect(result.success).toBe(true);
    });

    it('given no premiere date, when parsed, then it succeeds', () => {
      const result = showListItemSchema.safeParse({ ...breakingBadShow, premiered: null });

      expect(result.success).toBe(true);
    });
  });
});

describe('showSchema', () => {
  describe('when the payload is a captured TVmaze show', () => {
    it('given Breaking Bad, when parsed, then it succeeds despite the unmodelled extra fields', () => {
      const result = showSchema.safeParse(breakingBadShow);

      expect(result.success).toBe(true);
    });

    it('given a show from the index page, when parsed, then it succeeds', () => {
      const result = showSchema.safeParse(FIRST_PAGE_ITEM);

      expect(result.success).toBe(true);
    });
  });

  describe('when a detail field is missing', () => {
    it('given a show without a summary, when parsed, then it fails', () => {
      const result = showSchema.safeParse(showWithout('summary'));

      expect(result.success).toBe(false);
    });

    it('given a show without a status, when parsed, then it fails', () => {
      const result = showSchema.safeParse(showWithout('status'));

      expect(result.success).toBe(false);
    });

    it('given a show without a schedule, when parsed, then it fails', () => {
      const result = showSchema.safeParse(showWithout('schedule'));

      expect(result.success).toBe(false);
    });
  });

  describe('when a list field is missing', () => {
    it('given a show without a name, when parsed, then it fails', () => {
      const result = showSchema.safeParse(showWithout('name'));

      expect(result.success).toBe(false);
    });
  });

  describe('when the image is read for the detail page', () => {
    it('given the captured image, when parsed, then both urls come through', () => {
      const result = showSchema.safeParse(breakingBadShow);

      expect(result.data?.image).toEqual({
        medium: breakingBadShow.image.medium,
        original: breakingBadShow.image.original,
      });
    });

    it('given an image with only a medium url, when parsed, then it fails', () => {
      const image = { medium: breakingBadShow.image.medium };
      const result = showSchema.safeParse({ ...breakingBadShow, image });

      expect(result.success).toBe(false);
    });

    it('given no image at all, when parsed, then it succeeds', () => {
      const result = showSchema.safeParse({ ...breakingBadShow, image: null });

      expect(result.success).toBe(true);
    });
  });

  describe('when a nullable detail field is null', () => {
    it('given no summary, when parsed, then it succeeds', () => {
      const result = showSchema.safeParse({ ...breakingBadShow, summary: null });

      expect(result.success).toBe(true);
    });

    it('given neither a network nor a web channel, when parsed, then it succeeds', () => {
      const result = showSchema.safeParse({ ...breakingBadShow, network: null, webChannel: null });

      expect(result.success).toBe(true);
    });

    it('given no runtime at all, when parsed, then it succeeds', () => {
      const result = showSchema.safeParse({
        ...breakingBadShow,
        runtime: null,
        averageRuntime: null,
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('listSchema', () => {
  describe('when the body is an array', () => {
    it('given the captured index page, when parsed, then it succeeds', () => {
      const result = listSchema.safeParse(showsPageZero);

      expect(result.success).toBe(true);
    });

    it('given an array of unusable items, when parsed, then it still succeeds', () => {
      const result = listSchema.safeParse([{ id: 'x' }, null]);

      expect(result.success).toBe(true);
    });

    it('given an empty array, when parsed, then it succeeds', () => {
      const result = listSchema.safeParse([]);

      expect(result.success).toBe(true);
    });
  });

  describe('when the body is not an array', () => {
    it('given an object, when parsed, then it fails', () => {
      const result = listSchema.safeParse({ shows: [] });

      expect(result.success).toBe(false);
    });

    it('given null, when parsed, then it fails', () => {
      const result = listSchema.safeParse(null);

      expect(result.success).toBe(false);
    });
  });
});

describe('searchResultSchema', () => {
  describe('when the payload is a captured search result', () => {
    it('given the first fleabag hit, when parsed, then it succeeds', () => {
      const result = searchResultSchema.safeParse(FLEABAG_RESULT);

      expect(result.success).toBe(true);
    });

    it('given a result with an unusable show, when parsed, then it still succeeds', () => {
      const result = searchResultSchema.safeParse({ score: 0.5, show: { id: 'x' } });

      expect(result.success).toBe(true);
    });
  });

  describe('when the wrapper is malformed', () => {
    it('given a bare show with no score, when parsed, then it fails', () => {
      const result = searchResultSchema.safeParse({ show: breakingBadShow });

      expect(result.success).toBe(false);
    });

    it('given a score as a string, when parsed, then it fails', () => {
      const result = searchResultSchema.safeParse({ score: '0.9', show: breakingBadShow });

      expect(result.success).toBe(false);
    });
  });
});
