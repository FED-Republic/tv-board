import { describe, expect, it } from 'vitest';
import { describeLoadedPage } from '@/domain/dashboard-copy';

const GENRE = 'Drama';
/** A page of the whole index, the size TVmaze sends. */
const WHOLE_PAGE = 250;

/** What the page a press asked for brought, while TVmaze still has a page after it. */
const withPagesLeft = (loaded: number, inGenre: number): string =>
  describeLoadedPage({ loaded, inGenre }, GENRE, true);

/** The same page, once it was the last one TVmaze had and the button went with it. */
const onTheLastPage = (loaded: number, inGenre: number): string =>
  describeLoadedPage({ loaded, inGenre }, GENRE, false);

describe('describeLoadedPage', () => {
  describe('when no page has answered the reader yet', () => {
    it('given no report, when described, then the line stays empty', () => {
      expect(describeLoadedPage(null, GENRE, true)).toBe('');
    });

    it('given no report past the last page, when described, then the line stays empty', () => {
      expect(describeLoadedPage(null, GENRE, false)).toBe('');
    });
  });

  describe('when the page brought no show at all', () => {
    it('given a page left to ask for, when described, then the line offers the button again', () => {
      expect(withPagesLeft(0, 0)).toBe(
        'No more shows arrived from TVmaze. Load more to try again.',
      );
    });

    // Past the last page the end note has taken the button away, so pointing at it would lie.
    it('given no page left, when described, then the line drops the invitation', () => {
      expect(onTheLastPage(0, 0)).toBe('No more shows arrived from TVmaze.');
    });
  });

  describe('when the page brought no show of the genre', () => {
    it('given a page of 250 without Drama, when described, then it says what the page held', () => {
      expect(withPagesLeft(WHOLE_PAGE, 0)).toBe(
        'TVmaze sent 250 more shows, none of them Drama. Load more to keep looking.',
      );
    });

    it('given a page of one without Drama, when described, then the one show reads singular', () => {
      expect(withPagesLeft(1, 0)).toBe(
        'TVmaze sent 1 more show, none of them Drama. Load more to keep looking.',
      );
    });

    it('given no page left, when described, then the line drops the invitation', () => {
      expect(onTheLastPage(WHOLE_PAGE, 0)).toBe('TVmaze sent 250 more shows, none of them Drama.');
    });
  });

  describe('when the page brought shows of the genre', () => {
    it('given 12 Drama shows of 250, when described, then both counts are named', () => {
      expect(withPagesLeft(WHOLE_PAGE, 12)).toBe(
        'TVmaze sent 250 more shows. 12 of them are Drama.',
      );
    });

    it('given one Drama show of 250, when described, then the genre share reads singular', () => {
      expect(withPagesLeft(WHOLE_PAGE, 1)).toBe('TVmaze sent 250 more shows. 1 of them is Drama.');
    });

    it('given a page of one Drama show, when described, then both counts read singular', () => {
      expect(withPagesLeft(1, 1)).toBe('TVmaze sent 1 more show. 1 of them is Drama.');
    });

    // This branch never carried an invitation, so the last page takes nothing off it.
    it('given no page left, when described, then the line reads as it did', () => {
      expect(onTheLastPage(WHOLE_PAGE, 12)).toBe(withPagesLeft(WHOLE_PAGE, 12));
    });

    it('given a hyphenated genre, when described, then it is named as it is written', () => {
      expect(describeLoadedPage({ loaded: WHOLE_PAGE, inGenre: 3 }, 'Science-Fiction', true)).toBe(
        'TVmaze sent 250 more shows. 3 of them are Science-Fiction.',
      );
    });
  });
});
