import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/domain/not-found-error';

describe('NotFoundError', () => {
  describe('when it is raised without a message', () => {
    it('given no message, when thrown, then it is an Error', () => {
      expect(new NotFoundError()).toBeInstanceOf(Error);
    });

    it('given no message, when thrown, then it is named after itself', () => {
      expect(new NotFoundError().name).toBe('NotFoundError');
    });

    it('given no message, when thrown, then it reads as a missing show', () => {
      expect(new NotFoundError().message).toBe('Show not found');
    });
  });

  describe('when it is raised with a message', () => {
    it('given an invalid id, when thrown, then the message is kept', () => {
      expect(new NotFoundError('Invalid show id').message).toBe('Invalid show id');
    });

    it('given an invalid id, when thrown, then it is still a NotFoundError', () => {
      expect(new NotFoundError('Invalid show id')).toBeInstanceOf(NotFoundError);
    });
  });
});
