import { createTestingPinia } from '@pinia/testing';
import { render, screen } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import ShowCard from '@/components/show/ShowCard.vue';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';
import { aShow, createComponentRouter } from '../builders';

let pinia: ReturnType<typeof createTestingPinia>;
let router: Router;

beforeEach(async () => {
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
  router = await createComponentRouter('/');
});

const renderCard = (show: Show, eager = false) =>
  render(ShowCard, { props: { show, eager }, global: { plugins: [pinia, router] } });

const breakingBad = (): Show =>
  aShow({ name: 'Breaking Bad', rating: 9.3, premiered: '2008-01-20' });

const breakingBadWithoutPoster = (): Show =>
  aShow({ name: 'Breaking Bad', rating: 9.3, premiered: '2008-01-20', poster: null });

const ludwig = (): Show => aShow({ name: 'Ludwig', rating: null, premiered: '2011-11-11' });

describe('ShowCard', () => {
  describe('when the card links to a show', () => {
    it('given a rated show, when rendered, then the link name includes the rating', () => {
      renderCard(breakingBad());

      expect(screen.getByRole('link', { name: 'Breaking Bad, rated 9.3, 2008' })).toBeDefined();
    });

    it('given an unrated show, when rendered, then the link name says not rated', () => {
      renderCard(ludwig());

      expect(screen.getByRole('link', { name: 'Ludwig, Not rated, 2011' })).toBeDefined();
    });

    it('given a show without a premiere, when rendered, then the link name ends at the rating', () => {
      renderCard(aShow({ name: 'Breaking Bad', rating: 9.3, premiered: null }));

      expect(screen.getByRole('link', { name: 'Breaking Bad, rated 9.3' })).toBeDefined();
    });

    it('given a card, when rendered, then the poster adds nothing to the link name', () => {
      renderCard(breakingBad());

      expect(screen.getByTestId(TEST_IDS.showPosterImage).getAttribute('alt')).toBe('');
    });

    it('given a show id, when rendered, then the link points at the detail route', () => {
      renderCard(aShow({ id: 169 }));

      expect(screen.getByRole('link').getAttribute('href')).toBe('/shows/169');
    });

    it('given a show id, when rendered, then the card carries the id as a hook', () => {
      renderCard(aShow({ id: 169 }));

      expect(screen.getByTestId(TEST_IDS.showCard).dataset['showId']).toBe('169');
    });
  });

  describe('when the card is read on screen', () => {
    it('given a rated show, when rendered, then the name is visible', () => {
      renderCard(breakingBad());

      expect(screen.getByText('Breaking Bad')).toBeDefined();
    });

    it('given a rated show, when rendered, then the rating is visible', () => {
      renderCard(breakingBad());

      expect(screen.getByText('9.3')).toBeDefined();
    });

    it('given an unrated show, when rendered, then the card reads Not rated', () => {
      renderCard(ludwig());

      expect(screen.getByText('Not rated')).toBeDefined();
    });

    it('given a premiere date, when rendered, then only the year is shown', () => {
      renderCard(breakingBad());

      expect(screen.queryByText('2008')).not.toBeNull();
    });

    it('given no premiere date, when rendered, then no year is shown', () => {
      renderCard(aShow({ premiered: null }));

      expect(screen.queryByText('2008')).toBeNull();
    });
  });

  describe('when the show has no poster', () => {
    it('given no poster, when rendered, then the fallback stands in for the image', () => {
      renderCard(breakingBadWithoutPoster());

      expect(screen.getByTestId(TEST_IDS.showPosterFallback).textContent?.trim()).toBe(
        'No poster yet',
      );
    });

    it('given no poster, when rendered, then the fallback is hidden from assistive tech', () => {
      renderCard(breakingBadWithoutPoster());

      expect(screen.getByTestId(TEST_IDS.showPosterFallback).getAttribute('aria-hidden')).toBe(
        'true',
      );
    });

    it('given no poster, when rendered, then the link name is the one the poster card has', () => {
      renderCard(breakingBadWithoutPoster());

      expect(screen.getByRole('link', { name: 'Breaking Bad, rated 9.3, 2008' })).toBeDefined();
    });
  });

  describe('when the card carries its save toggles', () => {
    it('given a show, when rendered, then the bookmark toggle is named for it', () => {
      renderCard(breakingBad());

      expect(screen.getByRole('button', { name: 'Bookmark Breaking Bad' })).toBeDefined();
    });

    it('given a show, when rendered, then the like toggle is named for it', () => {
      renderCard(breakingBad());

      expect(screen.getByRole('button', { name: 'Like Breaking Bad' })).toBeDefined();
    });

    it('given a show, when rendered, then the bookmark toggle sits outside the link', () => {
      renderCard(breakingBad());

      expect(screen.getByTestId(TEST_IDS.showCardBookmark).closest('a')).toBeNull();
    });

    it('given a show, when rendered, then the like toggle sits outside the link', () => {
      renderCard(breakingBad());

      expect(screen.getByTestId(TEST_IDS.showCardLike).closest('a')).toBeNull();
    });
  });

  describe('when the card is above the fold', () => {
    it('given eager, when rendered, then the poster loads straight away', () => {
      renderCard(aShow(), true);

      expect(screen.getByTestId(TEST_IDS.showPosterImage).getAttribute('loading')).toBe('eager');
    });

    it('given no eager flag, when rendered, then the poster loads lazily', () => {
      renderCard(aShow());

      expect(screen.getByTestId(TEST_IDS.showPosterImage).getAttribute('loading')).toBe('lazy');
    });
  });
});
