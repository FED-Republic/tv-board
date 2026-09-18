/** Closes a `switch` over a union: adding a member fails the build at every unhandled site. */
export function assertNever(value: never, message = 'Unhandled case'): never {
  throw new Error(`${message}: ${String(value)}`);
}
