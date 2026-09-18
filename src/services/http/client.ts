import { AbortError, HttpError, NetworkError, toApiError } from '@/domain/api-error';

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RATE_LIMIT_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 500;
/** A `Retry-After` longer than this is not worth the wait; the back-off applies instead. */
export const MAX_RETRY_AFTER_MS = 10_000;

const MAX_SERVER_ERROR_ATTEMPTS = 2;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;
const MS_PER_SECOND = 1000;

export type RequestOptions = {
  readonly signal?: AbortSignal | undefined;
  readonly timeoutMs?: number;
};

type Attempts = {
  readonly rateLimited: number;
  readonly serverError: number;
};

/**
 * GET a JSON body. Fails with `NetworkError | HttpError | AbortError`. Each attempt has its own
 * timeout; `429` is retried with exponential back-off and jitter (at most three attempts,
 * honouring a short `Retry-After`), `5xx` once, other `4xx` never.
 */
export async function httpGetJson(url: string, options: RequestOptions = {}): Promise<unknown> {
  const { signal, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  let attempts: Attempts = { rateLimited: 0, serverError: 0 };

  for (;;) {
    const response = await fetchOrThrow(url, withTimeout(signal, timeoutMs));
    const retryDelayMs = retryDelayFor(response, attempts);

    if (retryDelayMs === null) {
      return readJson(response, url);
    }

    attempts = countAttempt(response.status, attempts);
    // The body of a response being retried is never read; cancelling it frees the connection.
    await response.body?.cancel();
    await wait(retryDelayMs, signal);
  }
}

async function fetchOrThrow(url: string, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (reason) {
    throw toApiError(reason);
  }
}

async function readJson(response: Response, url: string): Promise<unknown> {
  if (!response.ok) {
    throw new HttpError(response.status, url);
  }

  try {
    return await response.json();
  } catch (reason) {
    throw new NetworkError('Response body is not JSON', { cause: reason });
  }
}

/** Milliseconds to wait before the next attempt, or `null` when this response is final. */
function retryDelayFor(response: Response, attempts: Attempts): number | null {
  const isRateLimited = response.status === HTTP_TOO_MANY_REQUESTS;
  const isServerError = response.status >= HTTP_SERVER_ERROR_MIN;

  if (isRateLimited && attempts.rateLimited < MAX_RATE_LIMIT_ATTEMPTS - 1) {
    return retryAfterMs(response) ?? backOffDelayMs(attempts.rateLimited + 1);
  }

  if (isServerError && attempts.serverError < MAX_SERVER_ERROR_ATTEMPTS - 1) {
    return RETRY_BASE_DELAY_MS;
  }

  return null;
}

function countAttempt(status: number, attempts: Attempts): Attempts {
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return { ...attempts, rateLimited: attempts.rateLimited + 1 };
  }

  return { ...attempts, serverError: attempts.serverError + 1 };
}

/** The server's own delay in seconds, when it gives one that is short enough to honour. */
function retryAfterMs(response: Response): number | null {
  const seconds = Number(response.headers.get('Retry-After'));

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const delayMs = seconds * MS_PER_SECOND;

  return delayMs <= MAX_RETRY_AFTER_MS ? delayMs : null;
}

/** Doubles per attempt with up to one base delay of jitter, so clients do not retry in step. */
function backOffDelayMs(attempt: number): number {
  const exponential = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.random() * RETRY_BASE_DELAY_MS;

  return exponential + jitter;
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);

  if (signal === undefined) {
    return timeout;
  }

  return AbortSignal.any([signal, timeout]);
}

/** Resolves after `ms`, or rejects at once with the signal's reason mapped to an `ApiError`. */
function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(toApiError(signal.reason));
      return;
    }

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason instanceof Error ? toApiError(signal.reason) : new AbortError());
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
