import type { AsyncState } from '@/domain/async-state';
import { type ApiError, isApiError, toApiError } from '@/domain/api-error';
import { assertNever } from '@/domain/assert-never';
import { NotFoundError } from '@/domain/not-found-error';

/** Everything a page can fail with; `AsyncState` carries it as a value. */
export type LoadError = ApiError | NotFoundError;

const HTTP_TOO_MANY_REQUESTS = 429;

/** Keeps a typed failure as it is and maps anything else onto the typed set. */
export function toLoadError(reason: unknown): LoadError {
  if (reason instanceof NotFoundError || isApiError(reason)) {
    return reason;
  }

  return toApiError(reason);
}

/** The sentence a page shows under its error title, chosen by what failed. */
export function describeLoadFailure(failure: LoadError): string {
  switch (failure.name) {
    case 'NetworkError':
      return "TVmaze didn't answer in time. Check the connection and retry.";
    case 'HttpError':
      return describeHttpFailure(failure.status);
    case 'ValidationError':
      return 'TVmaze sent data this app cannot read. Retry, or try again later.';
    case 'AbortError':
      return 'The request was cancelled. Retry to load again.';
    case 'NotFoundError':
      return 'There is no show at this address.';
    default:
      return assertNever(failure);
  }
}

/** The sentence for a state that failed, and nothing at all for any other status. */
export function describeFailedState(state: AsyncState<unknown, LoadError>): string {
  return state.status === 'error' ? describeLoadFailure(state.error) : '';
}

function describeHttpFailure(status: number): string {
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return 'TVmaze is limiting requests right now. Wait a moment and retry.';
  }

  return `TVmaze answered with an error (HTTP ${status}). Retry in a moment.`;
}
