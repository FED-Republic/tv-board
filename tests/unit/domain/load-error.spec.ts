import { describe, expect, it } from 'vitest';
import { AbortError, HttpError, NetworkError, ValidationError } from '@/domain/api-error';
import { error, idle, loading, success } from '@/domain/async-state';
import {
  describeFailedState,
  describeLoadFailure,
  type LoadError,
  toLoadError,
} from '@/domain/load-error';
import { NotFoundError } from '@/domain/not-found-error';

const SHOW_URL = 'https://api.tvmaze.com/shows/169';
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 503;

describe('toLoadError', () => {
  describe('when the reason is already a typed failure', () => {
    it('given an HttpError, when mapped, then the same error comes back', () => {
      const failure = new HttpError(HTTP_SERVER_ERROR, SHOW_URL);

      expect(toLoadError(failure)).toBe(failure);
    });

    it('given a NotFoundError, when mapped, then the same error comes back', () => {
      const failure = new NotFoundError();

      expect(toLoadError(failure)).toBe(failure);
    });

    it('given a ValidationError, when mapped, then the same error comes back', () => {
      const failure = new ValidationError(['id: expected a number']);

      expect(toLoadError(failure)).toBe(failure);
    });

    it('given an AbortError, when mapped, then the same error comes back', () => {
      const failure = new AbortError();

      expect(toLoadError(failure)).toBe(failure);
    });

    it('given a NetworkError, when mapped, then the same error comes back', () => {
      const failure = new NetworkError('offline');

      expect(toLoadError(failure)).toBe(failure);
    });
  });

  describe('when the reason is anything else', () => {
    it('given a TypeError, when mapped, then it becomes a NetworkError', () => {
      expect(toLoadError(new TypeError('failed to fetch'))).toBeInstanceOf(NetworkError);
    });

    it('given a string, when mapped, then it becomes a NetworkError', () => {
      expect(toLoadError('boom')).toBeInstanceOf(NetworkError);
    });

    it('given a string, when mapped, then the thrown value is kept as the cause', () => {
      expect(toLoadError('boom')).toHaveProperty('cause', 'boom');
    });

    it('given undefined, when mapped, then it becomes a NetworkError', () => {
      expect(toLoadError(undefined)).toBeInstanceOf(NetworkError);
    });
  });
});

describe('describeLoadFailure', () => {
  describe('when the request never reached TVmaze', () => {
    it('given a NetworkError, when described, then the copy asks for a retry', () => {
      expect(describeLoadFailure(new NetworkError('offline'))).toBe(
        "TVmaze didn't answer in time. Check the connection and retry.",
      );
    });
  });

  describe('when TVmaze answered with an error status', () => {
    it('given a 429, when described, then the copy names the rate limit', () => {
      const rateLimited = new HttpError(HTTP_TOO_MANY_REQUESTS, SHOW_URL);

      expect(describeLoadFailure(rateLimited)).toBe(
        'TVmaze is limiting requests right now. Wait a moment and retry.',
      );
    });

    it('given a 503, when described, then the copy carries the status number', () => {
      const unavailable = new HttpError(HTTP_SERVER_ERROR, SHOW_URL);

      expect(describeLoadFailure(unavailable)).toBe(
        'TVmaze answered with an error (HTTP 503). Retry in a moment.',
      );
    });
  });

  describe('when the body could not be read', () => {
    it('given a ValidationError, when described, then the copy says the data is unreadable', () => {
      const invalid = new ValidationError(['id: expected a number']);

      expect(describeLoadFailure(invalid)).toBe(
        'TVmaze sent data this app cannot read. Retry, or try again later.',
      );
    });
  });

  describe('when the request was cancelled', () => {
    it('given an AbortError, when described, then the copy says it was cancelled', () => {
      expect(describeLoadFailure(new AbortError())).toBe(
        'The request was cancelled. Retry to load again.',
      );
    });
  });

  describe('when the show does not exist', () => {
    it('given a NotFoundError, when described, then the copy names the empty address', () => {
      expect(describeLoadFailure(new NotFoundError())).toBe('There is no show at this address.');
    });
  });
});

describe('describeFailedState', () => {
  describe('when the state failed', () => {
    it('given an error state, when described, then the copy names what failed', () => {
      const failed = error<unknown, LoadError>(new HttpError(HTTP_SERVER_ERROR, SHOW_URL));

      expect(describeFailedState(failed)).toBe(
        'TVmaze answered with an error (HTTP 503). Retry in a moment.',
      );
    });

    it('given a missing show, when described, then the copy names the empty address', () => {
      const failed = error<unknown, LoadError>(new NotFoundError());

      expect(describeFailedState(failed)).toBe('There is no show at this address.');
    });
  });

  describe('when the state has not failed', () => {
    it('given an idle state, when described, then there is nothing to say', () => {
      expect(describeFailedState(idle<unknown, LoadError>())).toBe('');
    });

    it('given a loading state, when described, then there is nothing to say', () => {
      expect(describeFailedState(loading<unknown, LoadError>())).toBe('');
    });

    it('given a success state, when described, then there is nothing to say', () => {
      const loaded = success<readonly string[], LoadError>(['Fleabag']);

      expect(describeFailedState(loaded)).toBe('');
    });
  });
});
