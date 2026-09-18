import { fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, describe, expect, it } from 'vitest';
import SearchField from '@/components/search/SearchField.vue';

const LABEL = 'Search shows by title';
const SHORTCUT_EVENT = { key: '/', bubbles: true, cancelable: true } as const;

const renderField = (modelValue = '') => render(SearchField, { props: { modelValue } });

function searchBox(): HTMLInputElement {
  const element = screen.getByRole('searchbox', { name: LABEL });

  if (!(element instanceof HTMLInputElement)) {
    throw new TypeError('The search field is not an input element');
  }

  return element;
}

function addOtherInput(): HTMLInputElement {
  const other = document.createElement('input');

  other.type = 'text';
  document.body.append(other);

  return other;
}

afterEach(() => {
  document.querySelectorAll('body > input').forEach((input) => input.remove());
});

describe('SearchField', () => {
  describe('when the field is rendered', () => {
    it('given no query, when rendered, then the field is a labelled search box', () => {
      renderField();

      expect(searchBox()).toBeDefined();
    });

    it('given no query, when rendered, then the placeholder invites a title', () => {
      renderField();

      expect(searchBox().getAttribute('placeholder')).toBe('Search shows');
    });

    it('given a query, when rendered, then the field shows it', () => {
      renderField('fleabag');

      expect(searchBox().value).toBe('fleabag');
    });
  });

  describe('when the reader types', () => {
    it('given an empty field, when text is typed, then the new query is emitted', async () => {
      const { emitted } = renderField();

      await fireEvent.update(searchBox(), 'fleabag');

      expect(emitted()['update:modelValue']).toEqual([['fleabag']]);
    });
  });

  describe('when the slash shortcut is pressed', () => {
    it('given focus outside a field, when slash is pressed, then the search box takes focus', () => {
      renderField();

      window.dispatchEvent(new KeyboardEvent('keydown', SHORTCUT_EVENT));

      expect(document.activeElement).toBe(searchBox());
    });

    it('given focus outside a field, when slash is pressed, then the key types nothing', () => {
      renderField();

      const shortcut = new KeyboardEvent('keydown', SHORTCUT_EVENT);
      window.dispatchEvent(shortcut);

      expect(shortcut.defaultPrevented).toBe(true);
    });

    it('given another input has focus, when slash is pressed, then focus stays there', () => {
      renderField();
      const other = addOtherInput();

      other.focus();
      other.dispatchEvent(new KeyboardEvent('keydown', SHORTCUT_EVENT));

      expect(document.activeElement).toBe(other);
    });

    it('given another key is pressed, when it bubbles to the window, then focus is untouched', () => {
      renderField();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

      expect(document.activeElement).not.toBe(searchBox());
    });
  });
});
