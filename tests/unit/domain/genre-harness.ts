import type { Genre, GenreLayout, GenreRow } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { aShow } from '../components/builders';

const TOP_RATING = 9.9;
const RATING_STEP = 0.1;

export const namesOf = (shows: readonly Show[]): readonly string[] =>
  shows.map((show) => show.name);

export const idsOf = (shows: readonly Show[]): readonly number[] => shows.map((show) => show.id);

export const genresOf = (rows: readonly GenreRow[]): readonly Genre[] =>
  rows.map((row) => row.genre);

/** The genres that earned a row of their own in the corpus under test. */
export const layoutOf = (genres: readonly Genre[]): GenreLayout => new Set(genres);

/** A row as the cache stores it; callers that read only its genre leave the card alone. */
export const aRow = (genre: Genre, total = 1): GenreRow => ({
  genre,
  shows: [aShow({ id: 1, genres: [genre] })],
  total,
});

export function showNamesIn(rows: readonly GenreRow[], genre: Genre): readonly string[] {
  const row = rows.find((candidate) => candidate.genre === genre);

  return row ? namesOf(row.shows) : [];
}

export function showTotalIn(rows: readonly GenreRow[], genre: Genre): number {
  const row = rows.find((candidate) => candidate.genre === genre);

  return row ? row.total : 0;
}

/** `count` shows in one genre, rated from `TOP_RATING` down, so their order is unambiguous. */
export function showsRatedDown(genre: string, count: number, firstId: number): readonly Show[] {
  return Array.from({ length: count }, (_unused, index) =>
    aShow({
      id: firstId + index,
      name: `${genre} ${index + 1}`,
      genres: [genre],
      rating: TOP_RATING - index * RATING_STEP,
    }),
  );
}

/** `count` distinct shows listing the same genres, for a corpus measured against `ROW_MIN_SHOWS`. */
export function showsListing(
  genres: readonly string[],
  count: number,
  firstId: number,
): readonly Show[] {
  return Array.from({ length: count }, (_unused, index) =>
    aShow({ id: firstId + index, name: `Show ${firstId + index}`, genres }),
  );
}
