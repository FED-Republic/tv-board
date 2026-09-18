import { describe, expect, it } from 'vitest';
import { isTypingTarget } from '@/lib/typing-target';

function anElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}

/**
 * jsdom leaves `isContentEditable` undefined, so the flag a browser derives from the attribute
 * is set here; the attribute alone would never reach the branch under test.
 */
function anEditableElement(): HTMLElement {
  const element = anElement('div');

  element.setAttribute('contenteditable', 'true');
  Object.defineProperty(element, 'isContentEditable', { value: true });

  return element;
}

describe('isTypingTarget', () => {
  describe('when the element takes typed text', () => {
    it('given a text input, when checked, then it is a typing target', () => {
      expect(isTypingTarget(anElement('input'))).toBe(true);
    });

    it('given a textarea, when checked, then it is a typing target', () => {
      expect(isTypingTarget(anElement('textarea'))).toBe(true);
    });

    it('given a select, when checked, then it is a typing target', () => {
      expect(isTypingTarget(anElement('select'))).toBe(true);
    });

    it('given an editable region, when checked, then it is a typing target', () => {
      expect(isTypingTarget(anEditableElement())).toBe(true);
    });
  });

  describe('when the element does not take typed text', () => {
    it('given a button, when checked, then it is not a typing target', () => {
      expect(isTypingTarget(anElement('button'))).toBe(false);
    });

    it('given a link, when checked, then it is not a typing target', () => {
      expect(isTypingTarget(anElement('a'))).toBe(false);
    });

    it('given a plain div, when checked, then it is not a typing target', () => {
      expect(isTypingTarget(anElement('div'))).toBe(false);
    });
  });

  describe('when there is no element', () => {
    it('given null, when checked, then it is not a typing target', () => {
      expect(isTypingTarget(null)).toBe(false);
    });

    it('given the document, when checked, then it is not a typing target', () => {
      expect(isTypingTarget(document)).toBe(false);
    });

    it('given the window, when checked, then it is not a typing target', () => {
      expect(isTypingTarget(window)).toBe(false);
    });
  });
});
