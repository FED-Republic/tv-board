import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SaveToggle from '@/components/show/SaveToggle.vue';
import { toShowId } from '@/domain/show';
import { useSavedStore } from '@/stores/saved';
import { TEST_IDS } from '@/testing/test-ids';

const BREAKING_BAD = toShowId(169);

let pinia: ReturnType<typeof createTestingPinia>;

beforeEach(() => {
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

function renderToggle(kind: 'bookmarks' | 'likes', labelled = false): void {
  render(SaveToggle, {
    props: { kind, showId: BREAKING_BAD, showName: 'Breaking Bad', labelled },
    global: { plugins: [pinia] },
  });
}

describe('SaveToggle', () => {
  describe('when the toggle is an icon over a poster', () => {
    it('given the bookmarks kind, when rendered, then it is named for the show', () => {
      renderToggle('bookmarks');

      expect(screen.getByRole('button', { name: 'Bookmark Breaking Bad' })).toBeDefined();
    });

    it('given the likes kind, when rendered, then it is named for the show', () => {
      renderToggle('likes');

      expect(screen.getByRole('button', { name: 'Like Breaking Bad' })).toBeDefined();
    });

    it('given nothing saved, when rendered, then the toggle is not pressed', () => {
      renderToggle('bookmarks');

      expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    });

    it('given the kind, when rendered, then the kind is exposed as a hook', () => {
      renderToggle('likes');

      expect(screen.getByTestId(TEST_IDS.saveToggle).dataset['kind']).toBe('likes');
    });
  });

  describe('when the toggle is pressed', () => {
    it('given an unsaved show, when clicked, then the toggle reports itself pressed', async () => {
      renderToggle('bookmarks');

      await fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    });

    it('given an unsaved show, when clicked, then the store holds the show id', async () => {
      renderToggle('bookmarks');

      await fireEvent.click(screen.getByRole('button'));

      expect(useSavedStore().idsOf('bookmarks').has(BREAKING_BAD)).toBe(true);
    });

    it('given a liked show, when clicked again, then the store drops the show id', async () => {
      renderToggle('likes');

      await fireEvent.click(screen.getByRole('button'));
      await fireEvent.click(screen.getByRole('button'));

      expect(useSavedStore().idsOf('likes').has(BREAKING_BAD)).toBe(false);
    });
  });

  describe('when the toggle carries a visible label', () => {
    it('given nothing saved, when rendered, then the button reads Bookmark', () => {
      renderToggle('bookmarks', true);

      expect(screen.getByRole('button', { name: 'Bookmark' })).toBeDefined();
    });

    it('given a bookmarked show, when clicked, then the label still reads Bookmark', async () => {
      renderToggle('bookmarks', true);

      await fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button').textContent?.trim()).toBe('Bookmark');
    });

    it('given a bookmarked show, when clicked, then the state is announced by aria-pressed', async () => {
      renderToggle('bookmarks', true);

      await fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    });

    it('given a liked show, when clicked, then the label still reads Like', async () => {
      renderToggle('likes', true);

      await fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button').textContent?.trim()).toBe('Like');
    });

    it('given a visible label, when rendered, then no aria-label competes with it', () => {
      renderToggle('likes', true);

      expect(screen.getByRole('button').hasAttribute('aria-label')).toBe(false);
    });
  });
});
