import { describe, expect, it } from 'vitest';
import type { Ref } from 'vue';
import { ref } from 'vue';
import { type ElementListener, useElementListeners } from '@/composables/useElementListeners';
import { withSetup } from './with-setup';

type ClickLog = {
  readonly listener: ElementListener;
  readonly count: () => number;
};

type Bound = {
  readonly unmount: () => void;
};

type KeydownLog = {
  readonly listener: ElementListener;
  readonly keys: readonly string[];
};

/** A click listener together with the number of clicks it has seen. */
function clickLog(): ClickLog {
  let clicks = 0;

  function onClick(): void {
    clicks += 1;
  }

  return { listener: { type: 'click', handler: onClick }, count: () => clicks };
}

/** A keydown listener, whose handler takes the `KeyboardEvent` its event name implies. */
function keydownLog(): KeydownLog {
  const keys: string[] = [];

  function onKeydown(event: KeyboardEvent): void {
    keys.push(event.key);
  }

  return { listener: { type: 'keydown', handler: onKeydown }, keys };
}

/** An ordering listener: it writes `name` into the shared log when it runs. */
function orderedListener(order: string[], name: string, capture: boolean): ElementListener {
  function onClick(): void {
    order.push(name);
  }

  return { type: 'click', handler: onClick, capture };
}

/** Runs the composable inside a mounted host, so the scope disposes on `unmount`. */
function bindListeners(
  target: Ref<HTMLElement | null>,
  listeners: readonly ElementListener[],
): Bound {
  const { unmount } = withSetup(() => {
    useElementListeners(target, listeners);

    return target;
  });

  return { unmount };
}

const clickOn = (element: HTMLElement): boolean =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

function rowWithCard(): { row: HTMLElement; card: HTMLElement } {
  const row = document.createElement('div');
  const card = document.createElement('button');

  row.append(card);

  return { row, card };
}

describe('useElementListeners', () => {
  describe('when the ref already holds an element', () => {
    it('given a bound row, when it is clicked, then the listener runs', () => {
      const row = document.createElement('div');
      const clicks = clickLog();
      bindListeners(ref(row), [clicks.listener]);

      clickOn(row);

      expect(clicks.count()).toBe(1);
    });
  });

  describe('when the ref is filled after the call', () => {
    it('given an element set without awaiting, when it is clicked, then the listener runs', () => {
      const row = document.createElement('div');
      const target = ref<HTMLElement | null>(null);
      const clicks = clickLog();
      bindListeners(target, [clicks.listener]);

      target.value = row;
      clickOn(row);

      expect(clicks.count()).toBe(1);
    });
  });

  describe('when the ref changes element', () => {
    it('given a replaced element, when the old one is clicked, then nothing runs', () => {
      const oldRow = document.createElement('div');
      const target = ref<HTMLElement | null>(oldRow);
      const clicks = clickLog();
      bindListeners(target, [clicks.listener]);

      target.value = document.createElement('div');
      clickOn(oldRow);

      expect(clicks.count()).toBe(0);
    });

    it('given a replaced element, when the new one is clicked, then the listener runs', () => {
      const newRow = document.createElement('div');
      const target = ref<HTMLElement | null>(document.createElement('div'));
      const clicks = clickLog();
      bindListeners(target, [clicks.listener]);

      target.value = newRow;
      clickOn(newRow);

      expect(clicks.count()).toBe(1);
    });
  });

  describe('when a listener names its event', () => {
    it('given a keydown listener, when ArrowRight is pressed, then it receives the typed event', () => {
      const row = document.createElement('div');
      const keydown = keydownLog();
      bindListeners(ref(row), [keydown.listener]);

      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(keydown.keys).toEqual(['ArrowRight']);
    });
  });

  describe('when a listener asks for the capture phase', () => {
    it('given a capturing row listener, when a card inside is clicked, then the row runs first', () => {
      const order: string[] = [];
      const { row, card } = rowWithCard();
      card.addEventListener('click', () => order.push('card'));
      bindListeners(ref(row), [orderedListener(order, 'row', true)]);

      clickOn(card);

      expect(order).toEqual(['row', 'card']);
    });

    it('given a bubbling row listener, when a card inside is clicked, then the card runs first', () => {
      const order: string[] = [];
      const { row, card } = rowWithCard();
      card.addEventListener('click', () => order.push('card'));
      bindListeners(ref(row), [orderedListener(order, 'row', false)]);

      clickOn(card);

      expect(order).toEqual(['card', 'row']);
    });
  });

  describe('when the scope is disposed', () => {
    it('given a bound row, when the host unmounts, then the listener stops running', () => {
      const row = document.createElement('div');
      const clicks = clickLog();
      const { unmount } = bindListeners(ref(row), [clicks.listener]);

      unmount();
      clickOn(row);

      expect(clicks.count()).toBe(0);
    });
  });
});
