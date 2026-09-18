import { describe, expect, it } from 'vitest';
import { assertNever } from '@/domain/assert-never';

describe('assertNever', () => {
  it('given a value that escaped the type system, when called, then it throws naming the value', () => {
    // The cast is the point: this is the runtime path for a value the compiler never expects.
    const escaped = 'unexpected' as never;
    expect(() => assertNever(escaped)).toThrow('Unhandled case: unexpected');
  });

  it('given a custom message, when called, then the message prefixes the value', () => {
    const escaped = 42 as never;
    expect(() => assertNever(escaped, 'Unknown status')).toThrow('Unknown status: 42');
  });
});
