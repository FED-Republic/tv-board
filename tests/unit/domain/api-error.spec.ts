import { describe, expect, it } from 'vitest';
import {
  AbortError,
  HttpError,
  NetworkError,
  ValidationError,
  isApiError,
  toApiError,
} from '@/domain/api-error';

const SHOW_URL = 'https://api.tvmaze.com/shows/999999';

/** `fetch` in Node rejects with a `DOMException` from another realm, so only its name is reliable. */
function crossRealmException(name: string): Error {
  const exception = new Error(`The operation failed: ${name}`);
  exception.name = name;

  return exception;
}

describe('NetworkError', () => {
  describe('when constructed with a message and a cause', () => {
    it('given a failed fetch, when constructed, then it is an Error named NetworkError', () => {
      const failure = new NetworkError('Failed to fetch');

      expect(failure).toBeInstanceOf(Error);
      expect(failure.name).toBe('NetworkError');
    });

    it('given a cause, when constructed, then the cause is kept for diagnosis', () => {
      const cause = new TypeError('Failed to fetch');

      const failure = new NetworkError('Failed to fetch', { cause });

      expect(failure.cause).toBe(cause);
    });
  });
});

describe('HttpError', () => {
  describe('when the server answered with a status', () => {
    it('given 404 and a url, when constructed, then the status is readable', () => {
      const failure = new HttpError(404, SHOW_URL);

      expect(failure.name).toBe('HttpError');
      expect(failure.status).toBe(404);
    });

    it('given 404 and a url, when constructed, then the message names the status and the url', () => {
      const failure = new HttpError(404, SHOW_URL);

      expect(failure.message).toBe(`HTTP 404 for ${SHOW_URL}`);
    });
  });
});

describe('ValidationError', () => {
  describe('when a response does not match the schema', () => {
    it('given two issues, when constructed, then the issues are kept in order', () => {
      const failure = new ValidationError([
        'name: Invalid input',
        'rating.average: Expected number',
      ]);

      expect(failure.name).toBe('ValidationError');
      expect(failure.issues).toEqual(['name: Invalid input', 'rating.average: Expected number']);
    });

    it('given two issues, when constructed, then the message lists them', () => {
      const failure = new ValidationError([
        'name: Invalid input',
        'rating.average: Expected number',
      ]);

      expect(failure.message).toContain('name: Invalid input');
      expect(failure.message).toContain('rating.average: Expected number');
    });
  });
});

describe('AbortError', () => {
  describe('when the caller cancelled the request', () => {
    it('given no arguments, when constructed, then it is an Error named AbortError', () => {
      const failure = new AbortError();

      expect(failure).toBeInstanceOf(Error);
      expect(failure.name).toBe('AbortError');
    });
  });
});

describe('isApiError', () => {
  describe('when the value is one of the four api errors', () => {
    it('given a NetworkError, when checked, then it is an api error', () => {
      expect(isApiError(new NetworkError('offline'))).toBe(true);
    });

    it('given an HttpError, when checked, then it is an api error', () => {
      expect(isApiError(new HttpError(500, SHOW_URL))).toBe(true);
    });

    it('given a ValidationError, when checked, then it is an api error', () => {
      expect(isApiError(new ValidationError(['id: Expected number']))).toBe(true);
    });

    it('given an AbortError, when checked, then it is an api error', () => {
      expect(isApiError(new AbortError())).toBe(true);
    });
  });

  describe('when the value is anything else', () => {
    it('given a plain Error, when checked, then it is not an api error', () => {
      expect(isApiError(new Error('boom'))).toBe(false);
    });

    it('given an object that only looks like an HttpError, when checked, then it is not an api error', () => {
      expect(isApiError({ name: 'HttpError', status: 404, message: 'HTTP 404' })).toBe(false);
    });

    it('given null, when checked, then it is not an api error', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('given a string, when checked, then it is not an api error', () => {
      expect(isApiError('HttpError')).toBe(false);
    });
  });
});

describe('toApiError', () => {
  describe('when the value is already an api error', () => {
    it('given an HttpError, when converted, then the same instance is returned', () => {
      const failure = new HttpError(404, SHOW_URL);

      expect(toApiError(failure)).toBe(failure);
    });
  });

  describe('when the request was aborted', () => {
    it('given a DOMException named AbortError, when converted, then it becomes an AbortError', () => {
      const converted = toApiError(new DOMException('The operation was aborted.', 'AbortError'));

      expect(converted).toBeInstanceOf(AbortError);
      expect(converted.message).toMatch(/abort/i);
    });

    it('given an exception named AbortError from another realm, when converted, then it becomes an AbortError', () => {
      expect(toApiError(crossRealmException('AbortError'))).toBeInstanceOf(AbortError);
    });
  });

  describe('when the request timed out', () => {
    it('given a DOMException named TimeoutError, when converted, then it becomes a NetworkError', () => {
      const timeout = new DOMException('The operation timed out.', 'TimeoutError');

      const converted = toApiError(timeout);

      expect(converted).toBeInstanceOf(NetworkError);
      expect(converted.message).toBe('Request timed out');
    });

    it('given a DOMException named TimeoutError, when converted, then the exception is kept as the cause', () => {
      const timeout = new DOMException('The operation timed out.', 'TimeoutError');

      expect(toApiError(timeout).cause).toBe(timeout);
    });

    it('given an exception named TimeoutError from another realm, when converted, then it reads as a timeout', () => {
      expect(toApiError(crossRealmException('TimeoutError')).message).toBe('Request timed out');
    });
  });

  describe('when fetch failed at the network level', () => {
    it('given a TypeError, when converted, then it becomes a NetworkError keeping the cause', () => {
      const failure = new TypeError('Failed to fetch');

      const converted = toApiError(failure);

      expect(converted).toBeInstanceOf(NetworkError);
      expect(converted.cause).toBe(failure);
    });
  });

  describe('when the value is not an error at all', () => {
    it('given a string, when converted, then it becomes an unexpected NetworkError', () => {
      const converted = toApiError('kaboom');

      expect(converted).toBeInstanceOf(NetworkError);
      expect(converted.message).toBe('Unexpected error');
    });

    it('given a string, when converted, then the value is kept as the cause', () => {
      expect(toApiError('kaboom').cause).toBe('kaboom');
    });

    it('given null, when converted, then it becomes an unexpected NetworkError', () => {
      expect(toApiError(null).message).toBe('Unexpected error');
    });
  });
});
