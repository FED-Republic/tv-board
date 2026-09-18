import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpGetJson, RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { AbortError, HttpError } from '@/domain/api-error';
import { server } from '../../../msw/server';

const URL_UNDER_TEST = 'https://api.tvmaze.com/shows/169';
const SHOW_BODY = { id: 169, name: 'Breaking Bad' };
const PAST_EVERY_BACK_OFF_MS = 10_000;
const LONGEST_FIRST_BACK_OFF_MS = RETRY_BASE_DELAY_MS * 2;

/** Serves one response per request in order, then 200, and reports how many requests arrived. */
function serveStatuses(statuses: readonly number[]): () => number {
  let requestCount = 0;

  server.use(
    http.get(URL_UNDER_TEST, () => {
      const status = statuses[requestCount] ?? 200;
      requestCount += 1;

      if (status === 200) {
        return HttpResponse.json(SHOW_BODY);
      }

      return new HttpResponse(null, { status });
    }),
  );

  return () => requestCount;
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('httpGetJson', () => {
  describe('when the server answers with 429', () => {
    it('given two rate limits then success, when fetched, then it resolves after three requests', async () => {
      const requestCount = serveStatuses([429, 429, 200]);

      const pending = httpGetJson(URL_UNDER_TEST);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      await expect(pending).resolves.toEqual(SHOW_BODY);
      expect(requestCount()).toBe(3);
    });

    it('given a rate limit, when the base back-off has not elapsed, then no retry is sent yet', async () => {
      const requestCount = serveStatuses([429, 200]);

      void httpGetJson(URL_UNDER_TEST);
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS - 1);

      expect(requestCount()).toBe(1);
    });

    it('given a rate limit, when the longest first back-off has elapsed, then a second request is sent', async () => {
      const requestCount = serveStatuses([429, 200]);

      void httpGetJson(URL_UNDER_TEST);
      await vi.advanceTimersByTimeAsync(LONGEST_FIRST_BACK_OFF_MS);

      expect(requestCount()).toBe(2);
    });

    it('given rate limits on every attempt, when the attempts run out, then it rejects with HttpError 429', async () => {
      serveStatuses([429, 429, 429, 429]);

      const failure = httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      expect(await failure).toBeInstanceOf(HttpError);
      expect(await failure).toHaveProperty('status', 429);
    });

    it('given rate limits on every attempt, when the attempts run out, then exactly three requests were made', async () => {
      const requestCount = serveStatuses([429, 429, 429, 429]);

      const failure = httpGetJson(URL_UNDER_TEST).catch(() => undefined);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);
      await failure;

      expect(requestCount()).toBe(3);
    });
  });

  describe('when the server answers with 500', () => {
    it('given a failure then success, when fetched, then it resolves after two requests', async () => {
      const requestCount = serveStatuses([500, 200]);

      const pending = httpGetJson(URL_UNDER_TEST);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      await expect(pending).resolves.toEqual(SHOW_BODY);
      expect(requestCount()).toBe(2);
    });

    it('given two failures, when the single retry is used up, then it rejects with HttpError 500', async () => {
      serveStatuses([500, 500, 200]);

      const failure = httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      expect(await failure).toBeInstanceOf(HttpError);
      expect(await failure).toHaveProperty('status', 500);
    });

    it('given two failures, when the single retry is used up, then exactly two requests were made', async () => {
      const requestCount = serveStatuses([500, 500, 200]);

      const failure = httpGetJson(URL_UNDER_TEST).catch(() => undefined);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);
      await failure;

      expect(requestCount()).toBe(2);
    });
  });

  describe('when rate limits and server errors are mixed', () => {
    it('given 429 then 500 then 429, when the last attempt succeeds, then it resolves', async () => {
      const requestCount = serveStatuses([429, 500, 429, 200]);

      const pending = httpGetJson(URL_UNDER_TEST);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      await expect(pending).resolves.toEqual(SHOW_BODY);
      expect(requestCount()).toBe(4);
    });

    it('given a 500 between two rate limits, when the rate limits run out, then it rejects with 429', async () => {
      serveStatuses([429, 500, 429, 429]);

      const failure = httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      expect(await failure).toHaveProperty('status', 429);
    });

    it('given a 500 between two rate limits, when the rate limits run out, then three attempts were rate limited', async () => {
      const requestCount = serveStatuses([429, 500, 429, 429]);

      const failure = httpGetJson(URL_UNDER_TEST).catch(() => undefined);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);
      await failure;

      expect(requestCount()).toBe(4);
    });

    it('given a rate limit before two server errors, when the single 5xx retry is spent, then it rejects with 500', async () => {
      const requestCount = serveStatuses([429, 500, 500, 200]);

      const failure = httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      expect(await failure).toHaveProperty('status', 500);
      expect(requestCount()).toBe(3);
    });
  });

  describe('when the caller aborts during the back-off wait', () => {
    it('given an abort between attempts, when it fires, then it rejects with an AbortError', async () => {
      serveStatuses([429, 200]);
      const controller = new AbortController();

      const failure = httpGetJson(URL_UNDER_TEST, { signal: controller.signal }).catch(
        (reason: unknown) => reason,
      );
      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);

      expect(await failure).toBeInstanceOf(AbortError);
    });

    it('given an abort between attempts, when it fires, then no retry is sent', async () => {
      const requestCount = serveStatuses([429, 200]);
      const controller = new AbortController();

      const failure = httpGetJson(URL_UNDER_TEST, { signal: controller.signal }).catch(
        () => undefined,
      );
      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);
      await failure;

      expect(requestCount()).toBe(1);
    });

    it('given an abort between attempts, when it fires, then the back-off timer is cleared', async () => {
      serveStatuses([429, 200]);
      const controller = new AbortController();

      const failure = httpGetJson(URL_UNDER_TEST, { signal: controller.signal }).catch(
        () => undefined,
      );
      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      await failure;

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
