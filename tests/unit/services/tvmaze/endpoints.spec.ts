import type { JsonBodyType } from 'msw';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { AbortError, HttpError, ValidationError } from '@/domain/api-error';
import type { Show } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { getShow, getShowsPage } from '@/services/tvmaze/endpoints';
import { showPayloadWithId } from '../../../msw/handlers';
import { server } from '../../../msw/server';
import breakingBadShow from '../../../resources/show-169.2026-09-16.json';

const SHOWS_URL = 'https://api.tvmaze.com/shows';
const SHOWS_ON_PAGE_ZERO = 240;
const BREAKING_BAD_ID = toShowId(169);
const MISSING_SHOW_ID = toShowId(999999);

/** Two readable shows around one TVmaze sent without a name. */
const PAGE_WITH_ONE_BROKEN_ITEM = [
  showPayloadWithId(1),
  { ...showPayloadWithId(2), name: null },
  showPayloadWithId(3),
];

const idsOf = (shows: readonly Show[]): readonly number[] => shows.map((show) => show.id);

function serveForever(url: string): void {
  server.use(
    http.get(url, async () => {
      await delay('infinite');
    }),
  );
}

function servePage(body: JsonBodyType): void {
  server.use(http.get(SHOWS_URL, () => HttpResponse.json(body)));
}

/** The captured detail payload with one field missing, to prove the detail schema is strict. */
function showWithoutSummary(): JsonBodyType {
  const stripped: Record<string, unknown> = structuredClone(breakingBadShow);

  delete stripped['summary'];

  return stripped;
}

describe('getShowsPage', () => {
  describe('when the page exists', () => {
    it('given page 0, when fetched, then every captured show is returned', async () => {
      const shows = await getShowsPage(0);

      expect(shows).toHaveLength(SHOWS_ON_PAGE_ZERO);
    });

    it('given page 0, when fetched, then the shows are mapped domain models', async () => {
      const shows = await getShowsPage(0);

      expect(shows[0]).toMatchObject({ id: 1, name: 'Under the Dome', rating: 6.6 });
    });

    it('given page 0, when fetched, then the shows carry no detail field', async () => {
      const shows = await getShowsPage(0);

      expect(shows[0]).not.toHaveProperty('summaryHtml');
    });
  });

  describe('when one item does not match the schema', () => {
    it('given a show without a name, when fetched, then only that show is dropped', async () => {
      servePage(PAGE_WITH_ONE_BROKEN_ITEM);

      const shows = await getShowsPage(0);

      expect(idsOf(shows)).toEqual([1, 3]);
    });
  });

  describe('when no item matches the schema', () => {
    it('given a page of unreadable items, when fetched, then it rejects with a ValidationError', async () => {
      servePage([{ id: 'x' }, { id: 'y' }]);

      const failure = await getShowsPage(0).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(ValidationError);
    });

    it('given a page of unreadable items, when fetched, then the issues name the bad field', async () => {
      servePage([{ id: 'x' }]);

      const failure = await getShowsPage(0).catch((reason: unknown) => reason);

      expect(failure).toHaveProperty(
        'issues',
        expect.arrayContaining([expect.stringMatching(/^id: /)]),
      );
    });
  });

  describe('when the body is not a list', () => {
    it('given an object, when fetched, then it rejects with a ValidationError', async () => {
      servePage({ shows: [] });

      const failure = await getShowsPage(0).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(ValidationError);
    });
  });

  describe('when the page holds no show', () => {
    it('given an empty list, when fetched, then an empty list is returned', async () => {
      servePage([]);

      await expect(getShowsPage(0)).resolves.toEqual([]);
    });
  });

  describe('when the page is past the end of the index', () => {
    it('given page 999, when fetched, then it rejects with an HttpError 404', async () => {
      const failure = await getShowsPage(999).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(HttpError);
      expect(failure).toHaveProperty('status', 404);
    });
  });

  describe('when the caller aborts', () => {
    it('given an abort while the page is pending, when it fires, then it rejects with an AbortError', async () => {
      serveForever(SHOWS_URL);
      const controller = new AbortController();

      const failure = getShowsPage(0, controller.signal).catch((reason: unknown) => reason);
      controller.abort();

      expect(await failure).toBeInstanceOf(AbortError);
    });
  });
});

describe('getShow', () => {
  describe('when the show exists', () => {
    it('given show 169, when fetched, then the mapped Breaking Bad detail is returned', async () => {
      const show = await getShow(BREAKING_BAD_ID);

      expect(show).toMatchObject({ id: 169, name: 'Breaking Bad', runtimeMinutes: 60 });
    });

    it('given show 169, when fetched, then the detail carries the summary html', async () => {
      const show = await getShow(BREAKING_BAD_ID);

      expect(show.summaryHtml).toBe(breakingBadShow.summary);
    });
  });

  describe('when the body is missing a detail field', () => {
    it('given a show without a summary, when fetched, then it rejects with a ValidationError', async () => {
      server.use(http.get(`${SHOWS_URL}/:id`, () => HttpResponse.json(showWithoutSummary())));

      const failure = await getShow(BREAKING_BAD_ID).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(ValidationError);
    });
  });

  describe('when the show is unknown', () => {
    it('given a missing id, when fetched, then it rejects with an HttpError 404', async () => {
      const failure = await getShow(MISSING_SHOW_ID).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(HttpError);
      expect(failure).toHaveProperty('status', 404);
    });
  });

  describe('when the caller aborts', () => {
    it('given an abort while the show is pending, when it fires, then it rejects with an AbortError', async () => {
      serveForever(`${SHOWS_URL}/:id`);
      const controller = new AbortController();

      const failure = getShow(BREAKING_BAD_ID, controller.signal).catch(
        (reason: unknown) => reason,
      );
      controller.abort();

      expect(await failure).toBeInstanceOf(AbortError);
    });
  });
});
