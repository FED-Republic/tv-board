import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpGetJson, MAX_RETRY_AFTER_MS, RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { server } from '../../../msw/server';

const URL_UNDER_TEST = 'https://api.tvmaze.com/shows/169';
const SHOW_BODY = { id: 169, name: 'Breaking Bad' };
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
/** Longer than any first back-off (base plus jitter), so the two delays cannot be confused. */
const HONOURED_DELAY_MS = 2_000;
const LONGEST_FIRST_BACK_OFF_MS = RETRY_BASE_DELAY_MS * 2;
const PAST_EVERY_BACK_OFF_MS = 30_000;
const MS_PER_SECOND = 1_000;

/** Answers the first request with `status` and that `Retry-After`, then with the show. */
function serveRetryAfter(status: number, retryAfter: string): () => number {
  let requestCount = 0;

  server.use(
    http.get(URL_UNDER_TEST, () => {
      requestCount += 1;

      if (requestCount > 1) {
        return HttpResponse.json(SHOW_BODY);
      }

      return new HttpResponse(null, { status, headers: { 'Retry-After': retryAfter } });
    }),
  );

  return () => requestCount;
}

/** Starts a request and swallows its outcome; the cases assert on the request count. */
function startRequest(): void {
  void httpGetJson(URL_UNDER_TEST).catch(() => undefined);
}

beforeEach(() => vi.useFakeTimers());

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(PAST_EVERY_BACK_OFF_MS);
  vi.useRealTimers();
});

describe('httpGetJson with a Retry-After header', () => {
  describe('when a rate limit names a short delay', () => {
    it('given "2" seconds, when the back-off would have elapsed, then no retry is sent yet', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '2');

      startRequest();
      await vi.advanceTimersByTimeAsync(LONGEST_FIRST_BACK_OFF_MS);

      expect(requestCount()).toBe(1);
    });

    it('given "2" seconds, when those seconds have elapsed, then the retry is sent', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '2');

      startRequest();
      await vi.advanceTimersByTimeAsync(HONOURED_DELAY_MS);

      expect(requestCount()).toBe(2);
    });

    it('given "2" seconds, when the retry succeeds, then the body is returned', async () => {
      serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '2');

      const pending = httpGetJson(URL_UNDER_TEST);
      await vi.advanceTimersByTimeAsync(HONOURED_DELAY_MS);

      await expect(pending).resolves.toEqual(SHOW_BODY);
    });
  });

  describe('when a rate limit names the longest delay still worth waiting', () => {
    it('given "10" seconds, when one second short of it has elapsed, then no retry is sent yet', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '10');

      startRequest();
      await vi.advanceTimersByTimeAsync(MAX_RETRY_AFTER_MS - MS_PER_SECOND);

      expect(requestCount()).toBe(1);
    });

    it('given "10" seconds, when they have elapsed, then the retry is sent', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '10');

      startRequest();
      await vi.advanceTimersByTimeAsync(MAX_RETRY_AFTER_MS);

      expect(requestCount()).toBe(2);
    });
  });

  describe('when a rate limit names a delay that is too long', () => {
    it('given "20" seconds, when the back-off has elapsed, then the retry is sent on the back-off', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '20');

      startRequest();
      await vi.advanceTimersByTimeAsync(LONGEST_FIRST_BACK_OFF_MS);

      expect(requestCount()).toBe(2);
    });
  });

  describe('when a rate limit names a delay that cannot be read', () => {
    it('given "in a while", when the back-off has elapsed, then the retry is sent on the back-off', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, 'in a while');

      startRequest();
      await vi.advanceTimersByTimeAsync(LONGEST_FIRST_BACK_OFF_MS);

      expect(requestCount()).toBe(2);
    });

    it('given "0", when the back-off has elapsed, then the retry is sent on the back-off', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '0');

      startRequest();
      await vi.advanceTimersByTimeAsync(LONGEST_FIRST_BACK_OFF_MS);

      expect(requestCount()).toBe(2);
    });

    it('given "-5", when the back-off has elapsed, then the retry is sent on the back-off', async () => {
      const requestCount = serveRetryAfter(HTTP_TOO_MANY_REQUESTS, '-5');

      startRequest();
      await vi.advanceTimersByTimeAsync(LONGEST_FIRST_BACK_OFF_MS);

      expect(requestCount()).toBe(2);
    });
  });

  describe('when a server error names a delay', () => {
    it('given a 500 with "5" seconds, when the base delay has elapsed, then the retry is already sent', async () => {
      const requestCount = serveRetryAfter(HTTP_SERVER_ERROR, '5');

      startRequest();
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);

      expect(requestCount()).toBe(2);
    });
  });
});
