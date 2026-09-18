import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import GenreRowSkeleton from '@/components/show/GenreRowSkeleton.vue';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

const PLACEHOLDER_CARD_COUNT = 7;
const DEFERRED_GENRE: Genre = 'Drama';
const HEADING_LEVEL = 2;

const renderSkeleton = (genre: Genre | null): unknown =>
  render(GenreRowSkeleton, { props: { genre } });

/** The placeholder a `DeferredBlock` shows for a row the reader has not scrolled to yet. */
const renderDeferredSkeleton = (genre: Genre): unknown =>
  render(GenreRowSkeleton, { props: { genre, deferred: true } });

const skeletonRow = (): HTMLElement => screen.getByTestId(TEST_IDS.genreRowSkeleton);

const skeletonHeading = (): HTMLElement => screen.getByTestId(TEST_IDS.genreRowSkeletonHeading);

const placeholderCards = (): readonly HTMLElement[] => screen.getAllByTestId(TEST_IDS.skeletonCard);

/** Each SkeletonCard already hides itself, so the strip around them is what must carry the flag. */
function cardStrip(): HTMLElement {
  const strip = placeholderCards()[0]?.parentElement;

  if (strip === null || strip === undefined) {
    throw new Error('the skeleton should hold its placeholder cards in a strip');
  }

  return strip;
}

describe('GenreRowSkeleton', () => {
  describe('when the genre is remembered', () => {
    it('given the Drama row, when rendered, then it is hidden from assistive technology', () => {
      renderSkeleton('Drama');

      expect(skeletonRow().getAttribute('aria-hidden')).toBe('true');
    });

    it('given the Drama row, when rendered, then the row is tagged with its genre', () => {
      renderSkeleton('Drama');

      expect(skeletonRow().dataset['genre']).toBe('Drama');
    });

    it('given the Drama row, when rendered, then the heading reads the genre', () => {
      renderSkeleton('Drama');

      expect(skeletonHeading().textContent?.trim()).toBe('Drama');
    });

    it('given the Drama row, when rendered, then seven placeholder cards stand in', () => {
      renderSkeleton('Drama');

      expect(placeholderCards()).toHaveLength(PLACEHOLDER_CARD_COUNT);
    });
  });

  describe('when the row stands in for a deferred row', () => {
    it('given the Drama row, when rendered, then it stays in the accessibility tree', () => {
      renderDeferredSkeleton(DEFERRED_GENRE);

      expect(skeletonRow().hasAttribute('aria-hidden')).toBe(false);
    });

    it('given the Drama row, when rendered, then its genre reads as a row heading', () => {
      renderDeferredSkeleton(DEFERRED_GENRE);

      const heading = screen.getByRole('heading', { level: HEADING_LEVEL, name: DEFERRED_GENRE });

      expect(heading).toBeDefined();
    });

    it('given the Drama row, when rendered, then the placeholder cards stay hidden', () => {
      renderDeferredSkeleton(DEFERRED_GENRE);

      expect(cardStrip().getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('when no genre is remembered', () => {
    it('given an anonymous row, when rendered, then the row carries no genre tag', () => {
      renderSkeleton(null);

      expect(skeletonRow().dataset['genre']).toBeUndefined();
    });

    it('given an anonymous row, when rendered, then the heading reads nothing', () => {
      renderSkeleton(null);

      expect(skeletonHeading().textContent?.trim()).toBe('');
    });

    it('given an anonymous row, when rendered, then seven placeholder cards stand in', () => {
      renderSkeleton(null);

      expect(placeholderCards()).toHaveLength(PLACEHOLDER_CARD_COUNT);
    });
  });
});
