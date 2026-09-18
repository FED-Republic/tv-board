import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ShowPoster from '@/components/show/ShowPoster.vue';
import type { DetailPoster, Poster } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';

/** A card poster carries the medium image alone; only the detail page is handed an original. */
const CARD_POSTER: Poster = { medium: 'https://example.test/breaking-bad-medium.jpg' };
const DETAIL_POSTER: DetailPoster = {
  medium: 'https://example.test/breaking-bad-medium.jpg',
  original: 'https://example.test/breaking-bad-original.jpg',
};

const BASE_PROPS = { poster: CARD_POSTER, name: 'Breaking Bad', rating: 9.3 };
/** TVmaze's `medium` poster, the only size a card loads. */
const MEDIUM_WIDTH_PX = 210;
const MEDIUM_HEIGHT_PX = 295;
/** TVmaze's `original`, the detail page's image, is 2:3. */
const ORIGINAL_WIDTH_PX = 1000;
const ORIGINAL_HEIGHT_PX = 1500;

const image = () => screen.getByRole('img', { name: 'Breaking Bad poster' });

describe('ShowPoster', () => {
  describe('when the show has a poster', () => {
    it('given a name, when rendered, then the image alt names the poster', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image()).toBeDefined();
    });

    it('given no source, when rendered, then the medium image is loaded', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image().getAttribute('src')).toBe(CARD_POSTER.medium);
    });

    it('given a detail poster and the original source, when rendered, then the original is loaded', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: DETAIL_POSTER, source: 'original' } });

      expect(image().getAttribute('src')).toBe(DETAIL_POSTER.original);
    });

    it('given a card poster and the original source, when rendered, then the card image is loaded', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, source: 'original' } });

      expect(image().getAttribute('src')).toBe(CARD_POSTER.medium);
    });

    it('given no eager flag, when rendered, then the image loads lazily', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image().getAttribute('loading')).toBe('lazy');
      expect(image().getAttribute('fetchpriority')).toBe('auto');
    });

    it('given eager, when rendered, then the image loads first and with priority', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, eager: true } });

      expect(image().getAttribute('loading')).toBe('eager');
      expect(image().getAttribute('fetchpriority')).toBe('high');
    });
  });

  describe('when the poster is decorative', () => {
    it('given decorative, when rendered, then the image alt is empty', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, decorative: true } });

      expect(screen.getByTestId(TEST_IDS.showPosterImage).getAttribute('alt')).toBe('');
    });

    it('given decorative, when rendered, then the image carries no name of its own', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, decorative: true } });

      expect(screen.queryByRole('img', { name: 'Breaking Bad poster' })).toBeNull();
    });

    it('given no decorative flag, when rendered, then the alt still names the show', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image().getAttribute('alt')).toBe('Breaking Bad poster');
    });
  });

  describe('when the image reserves its box', () => {
    it('given the medium source, when rendered, then the image carries its intrinsic width', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image().getAttribute('width')).toBe(String(MEDIUM_WIDTH_PX));
    });

    it('given the medium source, when rendered, then the image carries its intrinsic height', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image().getAttribute('height')).toBe(String(MEDIUM_HEIGHT_PX));
    });

    it('given a poster inside a row, when rendered, then the image cannot be dragged away', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(image().getAttribute('draggable')).toBe('false');
    });
  });

  describe('when the box follows the image it shows', () => {
    it('given no source, when rendered, then the box reports the medium image', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(screen.getByTestId(TEST_IDS.showPoster).dataset['source']).toBe('medium');
    });

    it('given the original source, when rendered, then the box reports the original image', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: DETAIL_POSTER, source: 'original' } });

      expect(screen.getByTestId(TEST_IDS.showPoster).dataset['source']).toBe('original');
    });

    it('given the original source, when rendered, then the image carries its intrinsic size', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: DETAIL_POSTER, source: 'original' } });

      expect(image().getAttribute('width')).toBe(String(ORIGINAL_WIDTH_PX));
      expect(image().getAttribute('height')).toBe(String(ORIGINAL_HEIGHT_PX));
    });
  });

  describe('when the show has no poster', () => {
    it('given a null poster, when rendered, then no image is loaded', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: null } });

      expect(screen.queryByRole('img')).toBeNull();
    });

    it('given a null poster, when rendered, then the fallback explains the gap', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: null } });

      expect(screen.getByTestId(TEST_IDS.showPosterFallback).textContent?.trim()).toBe(
        'No poster yet',
      );
    });

    it('given a decorative poster, when rendered, then the fallback is hidden from screen readers', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: null, decorative: true } });

      const fallback = screen.getByTestId(TEST_IDS.showPosterFallback);

      expect(fallback.getAttribute('aria-hidden')).toBe('true');
    });

    it('given a poster that names the show, when rendered, then the fallback stays readable', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, poster: null } });

      const fallback = screen.getByTestId(TEST_IDS.showPosterFallback);

      expect(fallback.hasAttribute('aria-hidden')).toBe(false);
    });
  });

  describe('when the rating bar is drawn', () => {
    it('given a rated show, when rendered, then the bar is present', () => {
      render(ShowPoster, { props: BASE_PROPS });

      expect(screen.queryByTestId(TEST_IDS.ratingBar)).not.toBeNull();
    });

    it('given an unrated show, when rendered, then no bar is drawn', () => {
      render(ShowPoster, { props: { ...BASE_PROPS, rating: null } });

      expect(screen.queryByTestId(TEST_IDS.ratingBar)).toBeNull();
    });
  });
});
