/** A TVmaze show id: a positive integer, minted only by `toShowId`. */
export type ShowId = number & { readonly __brand: 'ShowId' };

/** The card image (TVmaze `medium`, 210 × 295): the only size a list view or a cache carries. */
export type Poster = {
  readonly medium: string;
};

/** The detail page's images: the card size plus TVmaze's untouched original. */
export type DetailPoster = Poster & {
  readonly original: string;
};

export type PosterSource = 'medium' | 'original';

export type Network = {
  readonly name: string;
  readonly kind: 'network' | 'web-channel';
};

export type Schedule = {
  readonly time: string;
  readonly days: readonly string[];
};

/** What a card, a row and the index cache carry: the fields every list view reads. */
export type Show = {
  readonly id: ShowId;
  readonly name: string;
  readonly genres: readonly string[];
  readonly rating: number | null;
  readonly poster: Poster | null;
  readonly premiered: string | null;
};

/** The detail page's show: everything a card has, the original poster and the facts. */
export type ShowDetail = Omit<Show, 'poster'> & {
  readonly poster: DetailPoster | null;
  readonly summaryHtml: string | null;
  readonly ended: string | null;
  readonly status: string;
  readonly language: string | null;
  readonly runtimeMinutes: number | null;
  readonly network: Network | null;
  readonly schedule: Schedule;
  readonly url: string;
};

export function isShowId(value: unknown): value is ShowId {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function toShowId(value: number): ShowId {
  if (!isShowId(value)) {
    throw new RangeError(`Invalid show id: ${value}`);
  }

  return value;
}

/** The image URL for the wanted size; a list poster has only the card image to offer. */
export function posterSrc(poster: Poster | null, source: PosterSource): string | null {
  if (poster === null) {
    return null;
  }

  if (source === 'medium') {
    return poster.medium;
  }

  return isDetailPoster(poster) ? poster.original : poster.medium;
}

/** The list fields of a detail, so a fetched detail can join the index without its bulk. */
export const toShow = (detail: ShowDetail): Show => ({
  id: detail.id,
  name: detail.name,
  genres: detail.genres,
  rating: detail.rating,
  poster: toPoster(detail.poster),
  premiered: detail.premiered,
});

/** Field-by-field check for a value that claims to be a `Show`, such as a cache entry. */
export function isShow(value: unknown): value is Show {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isShowId(value.id)
    && typeof value.name === 'string'
    && isStringArray(value.genres)
    && isNullableNumber(value.rating)
    && isNullablePoster(value.poster)
    && isNullableString(value.premiered)
  );
}

const isDetailPoster = (poster: Poster): poster is DetailPoster => 'original' in poster;

/** The original URL is the detail page's alone, so the list poster keeps the card image only. */
const toPoster = (poster: DetailPoster | null): Poster | null =>
  poster === null ? null : { medium: poster.medium };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || typeof value === 'number';

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

function isNullablePoster(value: unknown): value is Poster | null {
  if (value === null) {
    return true;
  }

  return isRecord(value) && typeof value.medium === 'string';
}
