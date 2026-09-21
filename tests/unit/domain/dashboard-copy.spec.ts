import { describe, expect, it } from 'vitest';
import {
  describeEmptyDashboard,
  describeIndexStatus,
  describeLoadedPage,
  describeMoreShows,
} from '@/domain/dashboard-copy';
import { OTHER_GENRE } from '@/domain/genre';

type IndexProgress = Parameters<typeof describeIndexStatus>[0];

const LOADED_ROW_COUNT = 12;

/** What the status region announces for a dashboard in this state; the rest is a fresh page. */
const announcementFor = (progress: Partial<IndexProgress>): string =>
  describeIndexStatus({ status: 'idle', isLoadingMore: false, rowCount: 0, ...progress });

describe('describeIndexStatus', () => {
  describe('when the first page is still loading', () => {
    it('given the loading status, when described, then the index load is announced', () => {
      expect(announcementFor({ status: 'loading' })).toBe('Loading the show index');
    });

    it('given a background load as well, when described, then the first page wins', () => {
      expect(announcementFor({ status: 'loading', isLoadingMore: true })).toBe(
        'Loading the show index',
      );
    });
  });

  describe('when later pages widen the rows', () => {
    it('given a loaded index still growing, when described, then the extra load is announced', () => {
      expect(
        announcementFor({ status: 'success', isLoadingMore: true, rowCount: LOADED_ROW_COUNT }),
      ).toBe('Loading more shows');
    });
  });

  describe('when the index has settled', () => {
    it('given twelve rows, when described, then the rows are counted', () => {
      expect(announcementFor({ status: 'success', rowCount: LOADED_ROW_COUNT })).toBe(
        '12 genre rows loaded',
      );
    });

    it('given no row, when described, then the empty count is announced', () => {
      expect(announcementFor({ status: 'success' })).toBe('0 genre rows loaded');
    });
  });

  describe('when there is nothing to announce', () => {
    it('given the idle status, when described, then the region stays silent', () => {
      expect(announcementFor({ status: 'idle' })).toBe('');
    });

    it('given the error status, when described, then the region stays silent', () => {
      expect(announcementFor({ status: 'error' })).toBe('');
    });
  });
});

describe('describeEmptyDashboard', () => {
  describe('when no genre is selected', () => {
    it('given no genre, when described, then the heading names the whole loaded index', () => {
      expect(describeEmptyDashboard(null).heading).toBe('No shows in the loaded index.');
    });

    it('given no genre, when described, then the body says nothing has loaded yet', () => {
      expect(describeEmptyDashboard(null).body).toBe(
        'The dashboard shows the first pages of the TVmaze index; nothing has loaded from it yet.',
      );
    });
  });

  describe('when the reader filtered by genre', () => {
    it('given Drama, when described, then the heading names the genre', () => {
      expect(describeEmptyDashboard('Drama').heading).toBe('No Drama shows in the loaded index.');
    });

    it('given Drama, when described, then the body says the genre has no loaded show', () => {
      expect(describeEmptyDashboard('Drama').body).toBe(
        'The dashboard shows the first pages of the TVmaze index; this genre has no show there yet.',
      );
    });

    it('given a hyphenated genre, when described, then the heading names it as it is written', () => {
      expect(describeEmptyDashboard('Science-Fiction').heading).toBe(
        'No Science-Fiction shows in the loaded index.',
      );
    });
  });

  describe('when the empty grid is Other', () => {
    it('given Other, when described, then the heading says every loaded show has a row', () => {
      // An empty `Other` means every loaded genre earned a row, not that nothing loaded.
      expect(describeEmptyDashboard(OTHER_GENRE).heading).toBe(
        'Every loaded show is in a genre row.',
      );
    });

    it('given Other, when described, then the body says which shows the bucket holds', () => {
      expect(describeEmptyDashboard(OTHER_GENRE).body).toBe(
        `${OTHER_GENRE} holds the shows whose genres are too small for a row of their own.`,
      );
    });
  });
});

describe('describeMoreShows', () => {
  describe('when the app holds shows the grid is not rendering', () => {
    it('given more loaded Drama shows, when described, then the button reads Show more', () => {
      expect(describeMoreShows(true, 'Drama').text).toBe('Show more');
    });

    it('given more loaded Drama shows, when described, then the hint names the genre', () => {
      expect(describeMoreShows(true, 'Drama').hint).toBe('Drama shows');
    });

    it('given a hyphenated genre, when described, then the hint names it as it is written', () => {
      expect(describeMoreShows(true, 'Science-Fiction').hint).toBe('Science-Fiction shows');
    });
  });

  describe('when every loaded show of the genre is on screen', () => {
    it('given nothing left to render, when described, then the button reads Load more', () => {
      expect(describeMoreShows(false, 'Drama').text).toBe('Load more');
    });

    it('given nothing left to render, when described, then the hint names the source', () => {
      expect(describeMoreShows(false, 'Drama').hint).toBe('shows from TVmaze');
    });

    it('given another genre, when described, then the copy stays the same', () => {
      expect(describeMoreShows(false, 'Comedy')).toEqual(describeMoreShows(false, 'Drama'));
    });
  });
});

describe('describeLoadedPage', () => {
  describe('when no page has answered the reader yet', () => {
    it('given no report, when described, then the line stays empty', () => {
      expect(describeLoadedPage(null, 'Drama')).toBe('');
    });
  });

  describe('when the page brought no show at all', () => {
    it('given nothing loaded, when described, then the line offers the button again', () => {
      expect(describeLoadedPage({ loaded: 0, inGenre: 0 }, 'Drama')).toBe(
        'No more shows arrived from TVmaze. Load more to try again.',
      );
    });
  });

  describe('when the page brought no show of the genre', () => {
    it('given a page of 250 without Drama, when described, then it says what the page held', () => {
      expect(describeLoadedPage({ loaded: 250, inGenre: 0 }, 'Drama')).toBe(
        'TVmaze sent 250 more shows, none of them Drama. Load more to keep looking.',
      );
    });

    it('given a page of one without Drama, when described, then the one show reads singular', () => {
      expect(describeLoadedPage({ loaded: 1, inGenre: 0 }, 'Drama')).toBe(
        'TVmaze sent 1 more show, none of them Drama. Load more to keep looking.',
      );
    });
  });

  describe('when the page brought shows of the genre', () => {
    it('given 12 Drama shows of 250, when described, then both counts are named', () => {
      expect(describeLoadedPage({ loaded: 250, inGenre: 12 }, 'Drama')).toBe(
        'TVmaze sent 250 more shows. 12 of them are Drama.',
      );
    });

    it('given one Drama show of 250, when described, then the genre share reads singular', () => {
      expect(describeLoadedPage({ loaded: 250, inGenre: 1 }, 'Drama')).toBe(
        'TVmaze sent 250 more shows. 1 of them is Drama.',
      );
    });

    it('given a page of one Drama show, when described, then both counts read singular', () => {
      expect(describeLoadedPage({ loaded: 1, inGenre: 1 }, 'Drama')).toBe(
        'TVmaze sent 1 more show. 1 of them is Drama.',
      );
    });

    it('given a hyphenated genre, when described, then it is named as it is written', () => {
      expect(describeLoadedPage({ loaded: 250, inGenre: 3 }, 'Science-Fiction')).toBe(
        'TVmaze sent 250 more shows. 3 of them are Science-Fiction.',
      );
    });
  });
});
