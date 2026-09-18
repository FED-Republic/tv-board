import { http, HttpResponse, type RequestHandler } from 'msw';
import searchFleabagResults from '../resources/search-fleabag.2026-09-16.json';
import breakingBadShow from '../resources/show-169.2026-09-16.json';
import showsPageZero from '../resources/shows-page-0.2026-09-16.json';

/**
 * Default handlers shared by every spec. Add a handler here when an endpoint gains a fixture in
 * `tests/resources/`; override per test with `server.use(...)`.
 */

const BASE_URL = 'https://api.tvmaze.com';
const CAPTURED_PAGE = '0';
const CAPTURED_SHOW_ID = '169';
const CAPTURED_QUERY = 'fleabag';

/** TVmaze answers an unknown page or show id with this body, not with an empty list. */
const respondNotFound = () =>
  HttpResponse.json({ name: 'Not Found', status: 404 }, { status: 404 });

function respondWithShowsPage(request: Request) {
  const page = new URL(request.url).searchParams.get('page');

  if (page !== CAPTURED_PAGE) {
    return respondNotFound();
  }

  return HttpResponse.json(showsPageZero);
}

type ShowPayload = typeof breakingBadShow;

/** The captured show under another id, so a spec can serve a batch of distinct shows. */
export function showPayloadWithId(id: number): ShowPayload {
  return {
    ...breakingBadShow,
    id,
    name: `Show ${id}`,
    url: `https://www.tvmaze.com/shows/${id}`,
  };
}

function respondWithShow(id: string) {
  if (id !== CAPTURED_SHOW_ID) {
    return respondNotFound();
  }

  return HttpResponse.json(breakingBadShow);
}

function respondWithSearchResults(request: Request) {
  const query = new URL(request.url).searchParams.get('q');

  if (query !== CAPTURED_QUERY) {
    return HttpResponse.json([]);
  }

  return HttpResponse.json(searchFleabagResults);
}

export const handlers: readonly RequestHandler[] = [
  http.get(`${BASE_URL}/shows`, ({ request }) => respondWithShowsPage(request)),
  http.get(`${BASE_URL}/shows/:id`, ({ params }) => respondWithShow(String(params.id))),
  http.get(`${BASE_URL}/search/shows`, ({ request }) => respondWithSearchResults(request)),
];
