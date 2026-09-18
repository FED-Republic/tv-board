import { describe, expect, it } from 'vitest';
import type { SavedKind } from '@/domain/saved';
import { SAVED_KINDS, isSavedKind } from '@/domain/saved';

const kindOrNull = (value: unknown): SavedKind | null => (isSavedKind(value) ? value : null);

describe('SAVED_KINDS', () => {
  describe('when the closed set is read', () => {
    it('given the tuple, when joined, then it lists bookmarks before likes', () => {
      expect(SAVED_KINDS.join(',')).toBe('bookmarks,likes');
    });

    it('given the tuple, when deduplicated, then no kind appears twice', () => {
      expect(new Set(SAVED_KINDS).size).toBe(SAVED_KINDS.length);
    });
  });
});

describe('isSavedKind', () => {
  describe('when the value is a member of the set', () => {
    it('given "bookmarks", when checked, then it is a saved kind', () => {
      expect(isSavedKind('bookmarks')).toBe(true);
    });

    it('given "likes", when checked, then it is a saved kind', () => {
      expect(isSavedKind('likes')).toBe(true);
    });

    it('given "likes", when narrowed, then it is usable as a SavedKind', () => {
      expect(kindOrNull('likes')).toBe('likes');
    });
  });

  describe('when the value is another string', () => {
    it('given "Likes", when checked, then the wrong case is not a saved kind', () => {
      expect(isSavedKind('Likes')).toBe(false);
    });

    it('given "bookmark", when checked, then the singular is not a saved kind', () => {
      expect(isSavedKind('bookmark')).toBe(false);
    });

    it('given the empty string, when checked, then it is not a saved kind', () => {
      expect(isSavedKind('')).toBe(false);
    });
  });

  describe('when the value is not a string', () => {
    it('given undefined, when checked, then it is not a saved kind', () => {
      expect(isSavedKind(undefined)).toBe(false);
    });

    it('given null, when checked, then it is not a saved kind', () => {
      expect(isSavedKind(null)).toBe(false);
    });

    it('given 0, when checked, then it is not a saved kind', () => {
      expect(isSavedKind(0)).toBe(false);
    });

    it('given an object holding the kind, when checked, then it is not a saved kind', () => {
      expect(isSavedKind({ kind: 'likes' })).toBe(false);
    });

    it('given an array holding the kind, when checked, then it is not a saved kind', () => {
      expect(isSavedKind(['likes'])).toBe(false);
    });
  });
});
