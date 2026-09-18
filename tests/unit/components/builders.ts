import type { Router } from 'vue-router';
import type { DetailPoster, Poster, Show, ShowDetail } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { createTestRouter } from '../composables/test-router';

const BREAKING_BAD_POSTER: DetailPoster = {
  medium: 'https://example.test/breaking-bad-medium.jpg',
  original: 'https://example.test/breaking-bad-original.jpg',
};

/** A card and the index cache carry the medium image alone; the original is the detail page's. */
const BREAKING_BAD_CARD_POSTER: Poster = { medium: BREAKING_BAD_POSTER.medium };

const BREAKING_BAD: ShowDetail = {
  id: toShowId(169),
  name: 'Breaking Bad',
  genres: ['Drama', 'Crime', 'Thriller'],
  rating: 9.3,
  poster: BREAKING_BAD_POSTER,
  premiered: '2008-01-20',
  summaryHtml: '<p>A chemistry teacher turns to crime.</p>',
  ended: '2013-09-29',
  status: 'Ended',
  language: 'English',
  runtimeMinutes: 60,
  network: { name: 'AMC', kind: 'network' },
  schedule: { time: '22:00', days: ['Sunday'] },
  url: 'https://www.tvmaze.com/shows/169',
};

export type ShowDraft = Partial<Omit<Show, 'id'>> & { readonly id?: number };
export type ShowDetailDraft = Partial<Omit<ShowDetail, 'id'>> & { readonly id?: number };

const posterOf = (draft: ShowDraft): Poster | null =>
  draft.poster === undefined ? BREAKING_BAD_CARD_POSTER : draft.poster;

/** A complete list show; every field in the draft replaces the matching default. */
export function aShow(draft: ShowDraft = {}): Show {
  const { id = BREAKING_BAD.id, ...fields } = draft;
  const { name, genres, rating, premiered } = { ...BREAKING_BAD, ...fields };

  return { id: toShowId(id), name, genres, rating, poster: posterOf(draft), premiered };
}

/** A complete detail show, for the detail page, its facts and the detail endpoint. */
export function aShowDetail(draft: ShowDetailDraft = {}): ShowDetail {
  const { id = BREAKING_BAD.id, ...fields } = draft;

  return { ...BREAKING_BAD, ...fields, id: toShowId(id) };
}

/** The shared stub router under the name the component specs use; starts on the dashboard. */
export const createComponentRouter = (startLocation = '/'): Promise<Router> =>
  createTestRouter(startLocation);
