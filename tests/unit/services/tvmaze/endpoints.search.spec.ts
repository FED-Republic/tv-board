import type { JsonBodyType } from 'msw';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { AbortError, ValidationError } from '@/domain/api-error';
import type { Show } from '@/domain/show';
import { searchShows } from '@/services/tvmaze/endpoints';
import { showPayloadWithId } from '../../../msw/handlers';
import { server } from '../../../msw/server';

const SEARCH_URL = 'https://api.tvmaze.com/search/shows';

const idsOf = (shows: readonly Show[]): readonly number[] => shows.map((show) => show.id);

const scored = (show: JsonBodyType, score: number): JsonBodyType => ({ score, show });

function serveSearchResults(body: JsonBodyType): void {
  server.use(http.get(SEARCH_URL, () => HttpResponse.json(body)));
}

function serveForever(url: string): void {
  server.use(
    http.get(url, async () => {
      await delay('infinite');
    }),
  );
}

describe('searchShows', () => {
  describe('when the query matches shows', () => {
    it('given "fleabag", when searched, then the shows come back in score order', async () => {
      const shows = await searchShows('fleabag');

      expect(shows.map((show) => show.name)).toEqual(['Fleabag', 'Fleabag Monkeyface']);
    });

    it('given "fleabag", when searched, then each result is a mapped list model', async () => {
      const shows = await searchShows('fleabag');

      expect(shows[0]).toMatchObject({ id: 16149, rating: 8.1, premiered: '2016-07-21' });
    });
  });

  describe('when one result does not match the schema', () => {
    it('given a show without a name, when searched, then only that result is dropped', async () => {
      serveSearchResults([
        scored(showPayloadWithId(1), 0.9),
        scored({ ...showPayloadWithId(2), name: null }, 0.8),
        scored(showPayloadWithId(3), 0.7),
      ]);

      const shows = await searchShows('anything');

      expect(idsOf(shows)).toEqual([1, 3]);
    });

    it('given a result without a score, when searched, then only that result is dropped', async () => {
      serveSearchResults([{ show: showPayloadWithId(1) }, scored(showPayloadWithId(3), 0.7)]);

      const shows = await searchShows('anything');

      expect(idsOf(shows)).toEqual([3]);
    });
  });

  describe('when no result matches the schema', () => {
    it('given results with unreadable shows, when searched, then it rejects with a ValidationError', async () => {
      serveSearchResults([scored({ id: 'x' }, 0.9)]);

      const failure = await searchShows('anything').catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(ValidationError);
    });
  });

  describe('when the body is not a list', () => {
    it('given an object, when searched, then it rejects with a ValidationError', async () => {
      serveSearchResults({ results: [] });

      const failure = await searchShows('anything').catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(ValidationError);
    });
  });

  describe('when the query matches nothing', () => {
    it('given "brkng bd", when searched, then an empty list is returned', async () => {
      const shows = await searchShows('brkng bd');

      expect(shows).toEqual([]);
    });
  });

  describe('when the query needs encoding', () => {
    it('given a query with a space, when searched, then the query is url-encoded', async () => {
      let requestedUrl = '';
      server.use(
        http.get(SEARCH_URL, ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json([]);
        }),
      );

      await searchShows('breaking bad');

      expect(requestedUrl).toContain('q=breaking%20bad');
    });
  });

  describe('when the caller aborts', () => {
    it('given an abort while the search is pending, when it fires, then it rejects with an AbortError', async () => {
      serveForever(SEARCH_URL);
      const controller = new AbortController();

      const failure = searchShows('fleabag', controller.signal).catch((reason: unknown) => reason);
      controller.abort();

      expect(await failure).toBeInstanceOf(AbortError);
    });
  });
});
