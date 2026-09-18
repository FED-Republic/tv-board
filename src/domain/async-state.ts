/**
 * The only representation of loading and error in the app.
 * Templates branch on `status`; `assertNever` closes the switch.
 */
export type AsyncState<T, E = Error> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E };

export type AsyncStatus = AsyncState<unknown>['status'];

export const idle = <T, E = Error>(): AsyncState<T, E> => ({ status: 'idle' });
export const loading = <T, E = Error>(): AsyncState<T, E> => ({ status: 'loading' });
export const success = <T, E = Error>(data: T): AsyncState<T, E> => ({ status: 'success', data });
export const error = <T, E = Error>(reason: E): AsyncState<T, E> => ({
  status: 'error',
  error: reason,
});

/** Value for the `data-state` attribute on an async root. An empty list reads as `empty`. */
export function toDataState(state: AsyncState<unknown, unknown>): AsyncStatus | 'empty' {
  const isEmptyList =
    state.status === 'success' && Array.isArray(state.data) && state.data.length === 0;

  if (isEmptyList) {
    return 'empty';
  }

  return state.status;
}
