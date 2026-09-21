import type { AsyncStatus } from '@/domain/async-state';
import { type Genre, OTHER_GENRE } from '@/domain/genre';

type IndexProgress = {
  readonly status: AsyncStatus;
  readonly isLoadingMore: boolean;
  readonly rowCount: number;
};

/** What the dashboard's status region says; empty when there is nothing to announce. */
export function describeIndexStatus({ status, isLoadingMore, rowCount }: IndexProgress): string {
  if (status === 'loading') {
    return 'Loading the show index';
  }

  if (isLoadingMore) {
    return 'Loading more shows';
  }

  if (status !== 'success') {
    return '';
  }

  return `${describeGenreRowCount(rowCount)} loaded`;
}

const describeGenreRowCount = (count: number): string =>
  count === 1 ? '1 genre row' : `${count} genre rows`;

export type EmptyDashboardCopy = {
  readonly heading: string;
  readonly body: string;
};

const NOTHING_LOADED_BODY =
  'The dashboard shows the first pages of the TVmaze index; nothing has loaded from it yet.';
const UNLOADED_GENRE_BODY =
  'The dashboard shows the first pages of the TVmaze index; this genre has no show there yet.';

/**
 * What an empty dashboard says: for the whole index, for one genre, or for the `Other` bucket.
 * `Other` is empty only when every loaded genre earned a row of its own, which is the opposite
 * of the index holding none of its shows, so it gets a sentence that is true.
 */
export function describeEmptyDashboard(genre: Genre | null): EmptyDashboardCopy {
  if (genre === null) {
    return { heading: 'No shows in the loaded index.', body: NOTHING_LOADED_BODY };
  }

  if (genre === OTHER_GENRE) {
    return {
      heading: 'Every loaded show is in a genre row.',
      body: `${OTHER_GENRE} holds the shows whose genres are too small for a row of their own.`,
    };
  }

  return { heading: `No ${genre} shows in the loaded index.`, body: UNLOADED_GENRE_BODY };
}

type MoreShowsCopy = {
  readonly text: string;
  readonly hint: string;
};

/**
 * The genre grid's one more-shows button: it renders more of the shows already loaded while any
 * are left, and asks TVmaze for another index page once the grid holds every one of them. The
 * hint is hidden text, so the button is named "Show more Drama shows" and reads "Show more".
 */
export function describeMoreShows(canShowMore: boolean, genre: Genre): MoreShowsCopy {
  if (canShowMore) {
    return { text: 'Show more', hint: `${genre} shows` };
  }

  return { text: 'Load more', hint: 'shows from TVmaze' };
}

/**
 * What stands where the more-shows control stood once TVmaze has no page left. The control goes
 * with the last page, so the reason it went needs somewhere the reader can land on.
 */
export const LOADED_WHOLE_INDEX_TEXT = 'The whole TVmaze index is loaded.';

/** What one press of "Load more" brought: the shows TVmaze sent, and how many are in the genre. */
export type PageReport = {
  readonly loaded: number;
  readonly inGenre: number;
};

/**
 * The answer under the more-shows button once the page the reader asked for has landed. A page
 * with nothing for the genre says so and points at the button again, because the next page is
 * the only place more of the genre can come from. Past the last page there is no button left to
 * point at, and the end note beside this line already says why.
 */
export function describeLoadedPage(
  report: PageReport | null,
  genre: Genre,
  hasMorePages: boolean,
): string {
  if (report === null) {
    return '';
  }

  if (report.loaded === 0) {
    return `No more shows arrived from TVmaze.${describeInvitation(hasMorePages, 'Load more to try again.')}`;
  }

  const sent = `TVmaze sent ${describeMoreCount(report.loaded)}`;

  if (report.inGenre === 0) {
    return `${sent}, none of them ${genre}.${describeInvitation(hasMorePages, 'Load more to keep looking.')}`;
  }

  return `${sent}. ${describeGenreShare(report.inGenre, genre)}.`;
}

const describeInvitation = (hasMorePages: boolean, text: string): string =>
  hasMorePages ? ` ${text}` : '';

const describeMoreCount = (count: number): string =>
  count === 1 ? '1 more show' : `${count} more shows`;

const describeGenreShare = (count: number, genre: Genre): string =>
  count === 1 ? `1 of them is ${genre}` : `${count} of them are ${genre}`;
