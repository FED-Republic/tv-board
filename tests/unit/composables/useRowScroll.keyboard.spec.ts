import { afterEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useRowScroll } from '@/composables/useRowScroll';
import { withSetup } from './with-setup';

const DEFAULT_ITEM_SELECTOR = 'a[href]';

type Row = {
  readonly scroller: HTMLElement;
  readonly items: readonly HTMLElement[];
  readonly onKeydown: (event: KeyboardEvent) => void;
};

/** Links exercise the default `itemSelector`, so no options are passed. */
function aRowOfLinks(itemCount: number): Row {
  const scroller = document.createElement('div');

  scroller.tabIndex = 0;
  scroller.append(...linksNamed(itemCount));
  document.body.append(scroller);

  return mountRow(scroller, null);
}

function aRowOfButtons(itemCount: number): Row {
  const scroller = document.createElement('div');

  scroller.tabIndex = 0;
  scroller.append(...buttonsNamed(itemCount));
  document.body.append(scroller);

  return mountRow(scroller, 'button');
}

function mountRow(scroller: HTMLElement, itemSelector: string | null): Row {
  const element = ref<HTMLElement | null>(scroller);
  const { result } = withSetup(() =>
    itemSelector === null ? useRowScroll(element) : useRowScroll(element, { itemSelector }),
  );
  const items = [...scroller.querySelectorAll(itemSelector ?? DEFAULT_ITEM_SELECTOR)].filter(
    isHtmlElement,
  );

  return { scroller, items, onKeydown: result.onKeydown };
}

function linksNamed(count: number): readonly HTMLElement[] {
  return Array.from({ length: count }, (_unused, index) => {
    const link = document.createElement('a');

    link.href = `/shows/${index + 1}`;
    link.textContent = `Show ${index + 1}`;

    return link;
  });
}

function buttonsNamed(count: number): readonly HTMLElement[] {
  return Array.from({ length: count }, (_unused, index) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = `Show ${index + 1}`;

    return button;
  });
}

const isHtmlElement = (node: Element): node is HTMLElement => node instanceof HTMLElement;

const keydown = (key: string): KeyboardEvent =>
  new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

const focusedText = (): string => document.activeElement?.textContent ?? '';

afterEach(() => {
  document.body.replaceChildren();
});

describe('useRowScroll', () => {
  describe('when focus sits on an item', () => {
    it('given the first card, when ArrowRight is pressed, then the next card takes focus', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();

      row.onKeydown(keydown('ArrowRight'));

      expect(focusedText()).toBe('Show 2');
    });

    it('given the second card, when ArrowLeft is pressed, then the previous card takes focus', () => {
      const row = aRowOfLinks(3);
      row.items[1]?.focus();

      row.onKeydown(keydown('ArrowLeft'));

      expect(focusedText()).toBe('Show 1');
    });

    it('given the last card, when Home is pressed, then the first card takes focus', () => {
      const row = aRowOfLinks(3);
      row.items[2]?.focus();

      row.onKeydown(keydown('Home'));

      expect(focusedText()).toBe('Show 1');
    });

    it('given the first card, when End is pressed, then the last card takes focus', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();

      row.onKeydown(keydown('End'));

      expect(focusedText()).toBe('Show 3');
    });

    it('given the first card, when ArrowRight is pressed, then the browser default is stopped', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();
      const event = keydown('ArrowRight');

      row.onKeydown(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('when focus sits on the scroller', () => {
    it('given the scroller, when ArrowRight is pressed, then the first card takes focus', () => {
      const row = aRowOfLinks(3);
      row.scroller.focus();

      row.onKeydown(keydown('ArrowRight'));

      expect(focusedText()).toBe('Show 1');
    });

    it('given the scroller, when Home is pressed, then the first card takes focus', () => {
      const row = aRowOfLinks(3);
      row.scroller.focus();

      row.onKeydown(keydown('Home'));

      expect(focusedText()).toBe('Show 1');
    });

    it('given the scroller, when End is pressed, then the last card takes focus', () => {
      const row = aRowOfLinks(3);
      row.scroller.focus();

      row.onKeydown(keydown('End'));

      expect(focusedText()).toBe('Show 3');
    });
  });

  describe('when focus sits at an end of the row', () => {
    it('given the last card, when ArrowRight is pressed, then focus stays put', () => {
      const row = aRowOfLinks(3);
      row.items[2]?.focus();

      row.onKeydown(keydown('ArrowRight'));

      expect(focusedText()).toBe('Show 3');
    });

    it('given the first card, when ArrowLeft is pressed, then focus stays put', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();

      row.onKeydown(keydown('ArrowLeft'));

      expect(focusedText()).toBe('Show 1');
    });
  });

  describe('when another key is pressed', () => {
    it('given the first card, when a letter is pressed, then focus stays put', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();

      row.onKeydown(keydown('a'));

      expect(focusedText()).toBe('Show 1');
    });

    it('given the first card, when a letter is pressed, then the browser default stands', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();
      const event = keydown('a');

      row.onKeydown(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('given the first card, when ArrowDown is pressed, then the browser default stands', () => {
      const row = aRowOfLinks(3);
      row.items[0]?.focus();
      const event = keydown('ArrowDown');

      row.onKeydown(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('when the items are not links', () => {
    it('given a button selector, when ArrowRight is pressed, then the next button takes focus', () => {
      const row = aRowOfButtons(2);
      row.items[0]?.focus();

      row.onKeydown(keydown('ArrowRight'));

      expect(focusedText()).toBe('Show 2');
    });
  });

  describe('when the row has no items', () => {
    it('given an empty row, when ArrowRight is pressed, then nothing is thrown', () => {
      const row = aRowOfLinks(0);
      row.scroller.focus();

      expect(() => row.onKeydown(keydown('ArrowRight'))).not.toThrow();
    });
  });
});
