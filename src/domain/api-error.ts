/** The request never reached the server, timed out, or the response could not be read. */
export class NetworkError extends Error {
  override readonly name = 'NetworkError';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** The server answered with a status outside 2xx that no retry could clear. */
export class HttpError extends Error {
  override readonly name = 'HttpError';
  readonly status: number;

  constructor(status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
  }
}

/** The body did not match the schema; `issues` are `path: message` lines. */
export class ValidationError extends Error {
  override readonly name = 'ValidationError';
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid response: ${issues.join('; ')}`);
    this.issues = issues;
  }
}

/** The caller cancelled the request; never shown to the user. */
export class AbortError extends Error {
  override readonly name = 'AbortError';

  constructor(message = 'Request aborted') {
    super(message);
  }
}

export type ApiError = NetworkError | HttpError | ValidationError | AbortError;

export function isApiError(value: unknown): value is ApiError {
  return (
    value instanceof NetworkError
    || value instanceof HttpError
    || value instanceof ValidationError
    || value instanceof AbortError
  );
}

/**
 * Maps whatever `fetch` or a signal rejected with onto the typed set. Abort and timeout are
 * matched by name: the `DOMException` `fetch` rejects with can come from another realm, where
 * `instanceof DOMException` is false.
 */
export function toApiError(value: unknown): ApiError {
  if (isApiError(value)) {
    return value;
  }

  const name = errorNameOf(value);

  if (name === 'AbortError') {
    return new AbortError();
  }

  if (name === 'TimeoutError') {
    return new NetworkError('Request timed out', { cause: value });
  }

  if (value instanceof TypeError) {
    return new NetworkError('Network request failed', { cause: value });
  }

  return new NetworkError('Unexpected error', { cause: value });
}

function errorNameOf(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('name' in value)) {
    return null;
  }

  return typeof value.name === 'string' ? value.name : null;
}
