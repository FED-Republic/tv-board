import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import GenreSelect from '@/components/show/GenreSelect.vue';
import type { Genre } from '@/domain/genre';

const LABEL = 'Filter by genre';
const ALL_GENRES = '';

const renderSelect = (modelValue: Genre | null) => render(GenreSelect, { props: { modelValue } });

function genreSelect(): HTMLSelectElement {
  const element = screen.getByRole('combobox', { name: LABEL });

  if (!(element instanceof HTMLSelectElement)) {
    throw new TypeError('The genre filter is not a select element');
  }

  return element;
}

const optionNames = (): readonly string[] =>
  screen.getAllByRole('option').map((option) => option.textContent?.trim() ?? '');

describe('GenreSelect', () => {
  describe('when the filter is rendered', () => {
    it('given no genre, when rendered, then the select is labelled for screen readers', () => {
      renderSelect(null);

      expect(genreSelect()).toBeDefined();
    });

    it('given no genre, when rendered, then the first option clears the filter', () => {
      renderSelect(null);

      expect(optionNames()[0]).toBe('All genres');
    });

    it('given no genre, when rendered, then the genres follow in row order', () => {
      renderSelect(null);

      expect(optionNames()[1]).toBe('Drama');
    });

    it('given no genre, when rendered, then Other closes the list', () => {
      renderSelect(null);

      expect(optionNames().at(-1)).toBe('Other');
    });
  });

  describe('when a genre is chosen', () => {
    it('given no genre, when Drama is selected, then Drama is the new model value', async () => {
      const { emitted } = renderSelect(null);

      await fireEvent.update(genreSelect(), 'Drama');

      expect(emitted()['update:modelValue']).toEqual([['Drama']]);
    });

    it('given a genre, when All genres is selected, then the model value clears', async () => {
      const { emitted } = renderSelect('Drama');

      await fireEvent.update(genreSelect(), ALL_GENRES);

      expect(emitted()['update:modelValue']).toEqual([[null]]);
    });
  });

  describe('when the filter comes from the URL', () => {
    it('given Comedy as the model value, when rendered, then Comedy is selected', () => {
      renderSelect('Comedy');

      expect(genreSelect().value).toBe('Comedy');
    });

    it('given no genre, when rendered, then All genres is selected', () => {
      renderSelect(null);

      expect(genreSelect().value).toBe(ALL_GENRES);
    });
  });
});
