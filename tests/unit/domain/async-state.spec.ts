import { describe, expect, it } from 'vitest';
import { error, idle, loading, success, toDataState } from '@/domain/async-state';

describe('toDataState', () => {
  describe('when the state carries no data', () => {
    it('given idle, when mapped, then it reads idle', () => {
      expect(toDataState(idle())).toBe('idle');
    });

    it('given loading, when mapped, then it reads loading', () => {
      expect(toDataState(loading())).toBe('loading');
    });

    it('given an error, when mapped, then it reads error', () => {
      expect(toDataState(error(new Error('boom')))).toBe('error');
    });
  });

  describe('when the state is a success', () => {
    it('given a non-empty list, when mapped, then it reads success', () => {
      expect(toDataState(success([1, 2]))).toBe('success');
    });

    it('given an empty list, when mapped, then it reads empty', () => {
      expect(toDataState(success([]))).toBe('empty');
    });

    it('given a value that is not a list, when mapped, then it reads success', () => {
      expect(toDataState(success({ id: 1 }))).toBe('success');
    });
  });
});
