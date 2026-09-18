import type { Show } from '@/domain/show';

/** Row order on the dashboard. TVmaze has no genre list; this is the set seen in its index. */
export const GENRES = [
  'Drama',
  'Comedy',
  'Action',
  'Adventure',
  'Science-Fiction',
  'Fantasy',
  'Horror',
  'Thriller',
  'Crime',
  'Mystery',
  'Romance',
  'Family',
  'Children',
  'Anime',
  'Music',
  'Sports',
  'War',
  'Western',
  'History',
  'Legal',
  'Medical',
  'Espionage',
  'Supernatural',
  'Nature',
  'Food',
  'Travel',
  'DIY',
  'Adult',
] as const;

/** Bucket for the shows the other rows leave behind; always the last row. */
export const OTHER_GENRE = 'Other';

type KnownGenre = (typeof GENRES)[number];

export type Genre = KnownGenre | typeof OTHER_GENRE;

export type GenreRow = {
  readonly genre: Genre;
  /** The row's top-rated shows, at most the limit passed to `groupByGenre`. */
  readonly shows: readonly Show[];
  /** How many loaded shows carry the genre, including those the limit left out. */
  readonly total: number;
};

/**
 * The genres that earn a row of their own in one corpus of loaded shows. `Other` is never a
 * member: it takes what the rest leave behind and is never measured against the minimum.
 */
export type GenreLayout = ReadonlySet<Genre>;

/** Shows a dashboard row renders; a row longer than this scrolls past what anyone browses. */
export const ROW_SHOW_LIMIT = 25;

/**
 * Loaded shows a genre needs before it earns a row of its own. Below it a row costs a heading, a
 * scroller and a screen-reader stop to show one or two cards, so its shows wait in `Other`.
 */
export const ROW_MIN_SHOWS = 5;

/** The genre grid opens on exactly what the row held and grows by the same step. */
export const GRID_PAGE_SIZE = ROW_SHOW_LIMIT;

/** Placeholder rows on a first visit, before any genre has been remembered. */
const PLACEHOLDER_ROW_COUNT = 3;

/** Placeholder rows are capped at what a tall viewport shows; more only costs paint time. */
export const PLACEHOLDER_ROW_MAX = 6;

const KNOWN_GENRES: ReadonlySet<string> = new Set(GENRES);
const ROW_ORDER: readonly Genre[] = [...GENRES, OTHER_GENRE];
const ANONYMOUS_PLACEHOLDERS: readonly null[] = Array.from(
  { length: PLACEHOLDER_ROW_COUNT },
  () => null,
);

const isKnownGenre = (value: string): value is KnownGenre => KNOWN_GENRES.has(value);

export function isGenre(value: unknown): value is Genre {
  if (typeof value !== 'string') {
    return false;
  }

  return isKnownGenre(value) || value === OTHER_GENRE;
}

/**
 * Rating descending, unrated last, ties by the lower id, so rows never shuffle between visits.
 * TVmaze's `weight` would break ties by popularity, but a list show carries only what a card
 * renders and the index cache stores every field; the id is already there, and the lower one is the
 * show TVmaze has had longest.
 */
export function sortByRating(shows: readonly Show[]): readonly Show[] {
  return [...shows].sort(compareByRating);
}

/**
 * Which genres the loaded shows put on the dashboard: the ones `ROW_MIN_SHOWS` of them carry. A
 * show counts once for every genre it lists, so one show helps all of its genres earn a row.
 * Grouping and the genre grid are handed the same layout rather than counting twice; computed
 * apart they could disagree, and an expanded row's grid would hold shows the row never had.
 */
export function genreLayoutOf(shows: readonly Show[]): GenreLayout {
  const counts = countByGenre(shows);

  return new Set<Genre>(GENRES.filter((genre) => (counts.get(genre) ?? 0) >= ROW_MIN_SHOWS));
}

/**
 * One row per genre of the layout in `GENRES` order with `Other` last; empty rows are omitted.
 * A show joins every genre of its own that earns a row, and `Other` as well when one of them
 * does not, so a genre under the minimum costs a row and loses no show. With a `limit`, a row
 * keeps only its top-rated shows; the rest stay in the index for search and saved grids.
 */
export function groupByGenre(
  shows: readonly Show[],
  layout: GenreLayout,
  limit?: number,
): readonly GenreRow[] {
  const buckets = new Map<Genre, Show[]>();

  for (const show of dedupeById(shows)) {
    for (const genre of rowGenresOf(show, layout)) {
      const bucket = buckets.get(genre) ?? [];

      bucket.push(show);
      buckets.set(genre, bucket);
    }
  }

  return ROW_ORDER.filter((genre) => buckets.has(genre)).map((genre) => {
    const bucket = buckets.get(genre) ?? [];

    return { genre, shows: topRated(bucket, limit), total: bucket.length };
  });
}

/**
 * Every loaded show of the genre in rating order: what the genre grid pages through, so the
 * row's cap does not apply. A named genre answers the plain rule, so a genre under the minimum
 * still shows what has loaded to a reader who picks it in the header; `Other` answers the
 * layout, so its grid holds exactly what its row holds.
 */
export function showsInGenre(
  shows: readonly Show[],
  genre: Genre,
  layout: GenreLayout,
): readonly Show[] {
  const ofGenre = dedupeById(shows).filter((show) => isInGrid(show, genre, layout));

  return sortByRating(ofGenre);
}

/** The genres in `value` in row order; a non-array, unknown values and duplicates are dropped. */
export function orderGenres(value: unknown): readonly Genre[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const wanted = new Set(value.filter(isGenre));

  return ROW_ORDER.filter((genre) => wanted.has(genre));
}

/**
 * Rows that stand in while the index loads: the filtered genre, the remembered genres (at most
 * `PLACEHOLDER_ROW_MAX`), or anonymous rows.
 */
export function placeholderGenres(
  known: readonly Genre[],
  filter: Genre | null,
): readonly (Genre | null)[] {
  if (filter !== null) {
    return [filter];
  }

  if (known.length === 0) {
    return ANONYMOUS_PLACEHOLDERS;
  }

  return known.slice(0, PLACEHOLDER_ROW_MAX);
}

/**
 * The row a closing grid hands focus to: its own, `Other` when its genre earned no row of its
 * own, and the first row when neither is there, so closing never drops the reader on the body.
 */
export function revealTargetOf(rows: readonly GenreRow[], closing: Genre): Genre | null {
  const genres = rows.map((row) => row.genre);

  if (genres.includes(closing)) {
    return closing;
  }

  if (genres.includes(OTHER_GENRE)) {
    return OTHER_GENRE;
  }

  return genres[0] ?? null;
}

/**
 * Whether the show lists the genre at all, `Other` only when it lists no known one. The plain
 * rule, the same answer whatever else is loaded: search results and saved grids filter their own
 * corpus, where the dashboard's row minimum would hide shows the reader can see they have.
 */
export function hasGenre(show: Show, genre: Genre): boolean {
  const known = knownGenresOf(show);

  if (known.length === 0) {
    return genre === OTHER_GENRE;
  }

  return known.includes(genre);
}

function topRated(shows: readonly Show[], limit: number | undefined): readonly Show[] {
  const sorted = sortByRating(shows);

  return limit === undefined ? sorted : sorted.slice(0, limit);
}

function compareByRating(a: Show, b: Show): number {
  return compareRatings(a.rating, b.rating) || a.id - b.id;
}

function compareRatings(a: number | null, b: number | null): number {
  if (a === b) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return b - a;
}

function dedupeById(shows: readonly Show[]): readonly Show[] {
  const byId = new Map<number, Show>();

  for (const show of shows) {
    if (!byId.has(show.id)) {
      byId.set(show.id, show);
    }
  }

  return [...byId.values()];
}

/** How many loaded shows carry each known genre; a show counts once for every genre it lists. */
function countByGenre(shows: readonly Show[]): ReadonlyMap<Genre, number> {
  const counts = new Map<Genre, number>();

  for (const show of dedupeById(shows)) {
    for (const genre of knownGenresOf(show)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * The genres of the show this build knows by name, each once. TVmaze's list is a plain array of
 * strings, so a repeat in it would otherwise buy the genre a second vote toward its row and put
 * the show in that row twice.
 */
function knownGenresOf(show: Show): readonly Genre[] {
  return [...new Set(show.genres.filter(isKnownGenre))];
}

/** The rows a show joins: every genre of its own that earns one, plus `Other` for the rest. */
function rowGenresOf(show: Show, layout: GenreLayout): readonly Genre[] {
  const known = knownGenresOf(show);
  const earning = known.filter((genre) => layout.has(genre));
  const joinsOther = earning.length < known.length || known.length === 0;

  if (joinsOther) {
    return [...earning, OTHER_GENRE];
  }

  return earning;
}

/** `Other`'s grid answers the layout so it matches its row; a named genre answers the plain rule. */
function isInGrid(show: Show, genre: Genre, layout: GenreLayout): boolean {
  if (genre !== OTHER_GENRE) {
    return hasGenre(show, genre);
  }

  return rowGenresOf(show, layout).includes(OTHER_GENRE);
}
