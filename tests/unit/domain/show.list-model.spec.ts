import { describe, expect, it } from 'vitest';
import type { DetailPoster, Poster } from '@/domain/show';
import { posterSrc, toShow } from '@/domain/show';
import { aShowDetail } from '../components/builders';

const CARD_POSTER: Poster = { medium: 'https://example.test/medium.jpg' };
const DETAIL_POSTER: DetailPoster = {
  medium: 'https://example.test/medium.jpg',
  original: 'https://example.test/original.jpg',
};

describe('posterSrc', () => {
  describe('when the show has no poster', () => {
    it('given a null poster, when the card image is asked for, then there is no url', () => {
      expect(posterSrc(null, 'medium')).toBeNull();
    });

    it('given a null poster, when the original image is asked for, then there is no url', () => {
      expect(posterSrc(null, 'original')).toBeNull();
    });
  });

  describe('when the poster comes from a list', () => {
    it('given a list poster, when the card image is asked for, then the card url comes back', () => {
      expect(posterSrc(CARD_POSTER, 'medium')).toBe('https://example.test/medium.jpg');
    });

    it('given a list poster, when the original is asked for, then it falls back to the card url', () => {
      expect(posterSrc(CARD_POSTER, 'original')).toBe('https://example.test/medium.jpg');
    });
  });

  describe('when the poster comes from a detail', () => {
    it('given a detail poster, when the original is asked for, then the original url comes back', () => {
      expect(posterSrc(DETAIL_POSTER, 'original')).toBe('https://example.test/original.jpg');
    });

    it('given a detail poster, when the card image is asked for, then the card url comes back', () => {
      expect(posterSrc(DETAIL_POSTER, 'medium')).toBe('https://example.test/medium.jpg');
    });
  });
});

describe('toShow', () => {
  describe('when a detail joins the index', () => {
    it('given a full detail, when projected, then only the list fields come back', () => {
      const detail = aShowDetail({ poster: DETAIL_POSTER });

      expect(toShow(detail)).toEqual({
        id: detail.id,
        name: 'Breaking Bad',
        genres: ['Drama', 'Crime', 'Thriller'],
        rating: 9.3,
        poster: CARD_POSTER,
        premiered: '2008-01-20',
      });
    });

    it('given a detail poster, when projected, then the original url is left behind', () => {
      const projected = toShow(aShowDetail({ poster: DETAIL_POSTER }));

      expect(projected.poster).not.toHaveProperty('original');
    });

    it('given a full detail, when projected, then the summary is left behind', () => {
      expect(toShow(aShowDetail())).not.toHaveProperty('summaryHtml');
    });

    it('given a detail with no poster and no rating, when projected, then both stay null', () => {
      const bareDetail = aShowDetail({ poster: null, rating: null });

      expect(toShow(bareDetail)).toMatchObject({ poster: null, rating: null });
    });
  });
});
