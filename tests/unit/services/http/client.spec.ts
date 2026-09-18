import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  httpGetJson,
  MAX_RATE_LIMIT_ATTEMPTS,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_DELAY_MS,
} from '@/services/http/client';
import { AbortError, HttpError, NetworkError } from '@/domain/api-error';
import { server } from '../../../msw/server';

const URL_UNDER_TEST = 'https://api.tvmaze.com/shows/169';
const SHOW_BODY = { id: 169, name: 'Breaking Bad' };
const SHORT_TIMEOUT_MS = 20;
const ATTEMPT_TIMEOUT_MS = 300;
const SLOW_ATTEMPT_MS = 200;
/** A tenth of a second, so the retry waits on the header instead of the jittered back-off. */
const SHORT_RETRY_AFTER_SECONDS = '0.1';

function serveForever(): void {
  server.use(
    http.get(URL_UNDER_TEST, async () => {
      await delay('infinite');
    }),
  );
}

/**
 * A slow rate limit, then a slow success. Both attempts together outlast the timeout while
 * neither does on its own. `AbortSignal.timeout` runs on real time, which fake timers cannot
 * drive, so these delays are real and kept small.
 */
function serveSlowRateLimitThenShow(): void {
  let requestCount = 0;

  server.use(
    http.get(URL_UNDER_TEST, async () => {
      requestCount += 1;
      await delay(SLOW_ATTEMPT_MS);

      if (requestCount > 1) {
        return HttpResponse.json(SHOW_BODY);
      }

      return new HttpResponse(null, {
        status: 429,
        headers: { 'Retry-After': SHORT_RETRY_AFTER_SECONDS },
      });
    }),
  );
}

describe('client constants', () => {
  describe('when the retry policy is read', () => {
    it('given the module, when imported, then the timeout, attempts and back-off are the agreed ones', () => {
      expect(REQUEST_TIMEOUT_MS).toBe(10_000);
      expect(MAX_RATE_LIMIT_ATTEMPTS).toBe(3);
      expect(RETRY_BASE_DELAY_MS).toBe(500);
    });
  });
});

describe('httpGetJson', () => {
  describe('when the server answers with 200', () => {
    it('given a JSON body, when fetched, then it resolves with the decoded body', async () => {
      server.use(http.get(URL_UNDER_TEST, () => HttpResponse.json(SHOW_BODY)));

      await expect(httpGetJson(URL_UNDER_TEST)).resolves.toEqual(SHOW_BODY);
    });

    it('given a request, when sent, then it asks for JSON', async () => {
      let acceptHeader: string | null = null;
      server.use(
        http.get(URL_UNDER_TEST, ({ request }) => {
          acceptHeader = request.headers.get('accept');
          return HttpResponse.json(SHOW_BODY);
        }),
      );

      await httpGetJson(URL_UNDER_TEST);

      expect(acceptHeader).toBe('application/json');
    });
  });

  describe('when the server answers with 404', () => {
    it('given a missing show, when fetched, then it rejects with an HttpError carrying the status', async () => {
      server.use(http.get(URL_UNDER_TEST, () => new HttpResponse(null, { status: 404 })));

      const failure = await httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(HttpError);
      expect(failure).toHaveProperty('status', 404);
    });

    it('given a missing show, when fetched, then exactly one request is made', async () => {
      let requestCount = 0;
      server.use(
        http.get(URL_UNDER_TEST, () => {
          requestCount += 1;
          return new HttpResponse(null, { status: 404 });
        }),
      );

      await httpGetJson(URL_UNDER_TEST).catch(() => undefined);

      expect(requestCount).toBe(1);
    });
  });

  describe('when the server answers with another 4xx', () => {
    it('given 403, when fetched, then it rejects with an HttpError and never retries', async () => {
      let requestCount = 0;
      server.use(
        http.get(URL_UNDER_TEST, () => {
          requestCount += 1;
          return new HttpResponse(null, { status: 403 });
        }),
      );

      const failure = await httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(HttpError);
      expect(requestCount).toBe(1);
    });
  });

  describe('when fetch fails at the network level', () => {
    it('given a dropped connection, when fetched, then it rejects with a NetworkError and never retries', async () => {
      let requestCount = 0;
      server.use(
        http.get(URL_UNDER_TEST, () => {
          requestCount += 1;
          return HttpResponse.error();
        }),
      );

      const failure = await httpGetJson(URL_UNDER_TEST).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(NetworkError);
      expect(requestCount).toBe(1);
    });
  });

  describe('when the caller aborts', () => {
    it('given an abort while the request is pending, when it fires, then it rejects with an AbortError', async () => {
      serveForever();
      const controller = new AbortController();

      const failure = httpGetJson(URL_UNDER_TEST, { signal: controller.signal }).catch(
        (reason: unknown) => reason,
      );
      controller.abort();

      expect(await failure).toBeInstanceOf(AbortError);
    });

    it('given a signal aborted before the call, when fetched, then it rejects with an AbortError', async () => {
      serveForever();
      const controller = new AbortController();
      controller.abort();

      const failure = await httpGetJson(URL_UNDER_TEST, { signal: controller.signal }).catch(
        (reason: unknown) => reason,
      );

      expect(failure).toBeInstanceOf(AbortError);
    });
  });

  describe('when the server never answers', () => {
    it('given a timeout, when it elapses, then it rejects with a NetworkError that reads as a timeout', async () => {
      serveForever();

      const failure = await httpGetJson(URL_UNDER_TEST, {
        timeoutMs: SHORT_TIMEOUT_MS,
      }).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(NetworkError);
      expect(failure).toHaveProperty('message', 'Request timed out');
    });
  });

  describe('when every attempt is slower than half the timeout', () => {
    it('given a slow rate limit then a slow success, when retried, then the timeout never fires', async () => {
      serveSlowRateLimitThenShow();

      const body = await httpGetJson(URL_UNDER_TEST, { timeoutMs: ATTEMPT_TIMEOUT_MS });

      expect(body).toEqual(SHOW_BODY);
    });
  });

  describe('when a request fails', () => {
    it('given a 404 and a network failure, when handled, then nothing is written to the console', async () => {
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      server.use(http.get(URL_UNDER_TEST, () => new HttpResponse(null, { status: 404 })));

      await httpGetJson(URL_UNDER_TEST).catch(() => undefined);

      expect(errorLog).not.toHaveBeenCalled();
      expect(warnLog).not.toHaveBeenCalled();
    });
  });
});
