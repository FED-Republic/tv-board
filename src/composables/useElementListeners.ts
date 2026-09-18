import { onScopeDispose, type Ref, watch } from 'vue';

type EventName = keyof HTMLElementEventMap;

/** Method syntax on purpose: a handler for a narrower event is accepted where `Event` would be. */
type ListenerFor<K extends EventName> = {
  readonly type: K;
  handler(event: HTMLElementEventMap[K]): void;
  readonly capture?: boolean;
};

/** A listener whose handler matches its event name: a `MouseEvent` handler cannot take `keydown`. */
export type ElementListener = { [K in EventName]: ListenerFor<K> }[EventName];

/**
 * Binds listeners to a template ref for the life of the scope. Templates cannot put handlers
 * on a non-interactive element (the accessibility lint refuses), so a scroll region binds here.
 */
export function useElementListeners(
  target: Ref<HTMLElement | null>,
  listeners: readonly ElementListener[],
): void {
  function bind(element: HTMLElement): void {
    for (const listener of listeners) {
      bindOne(element, listener);
    }
  }

  function unbind(element: HTMLElement): void {
    for (const listener of listeners) {
      unbindOne(element, listener);
    }
  }

  // Synchronous flush: the listeners exist the moment the template ref is set, so an event
  // fired right after mount is not lost to the scheduler.
  watch(
    target,
    (element, previous) => {
      if (previous) {
        unbind(previous);
      }

      if (element) {
        bind(element);
      }
    },
    { immediate: true, flush: 'sync' },
  );

  onScopeDispose(() => {
    if (target.value) {
      unbind(target.value);
    }
  });
}

function bindOne<K extends EventName>(element: HTMLElement, listener: ListenerFor<K>): void {
  element.addEventListener(listener.type, listener.handler, { capture: listener.capture ?? false });
}

function unbindOne<K extends EventName>(element: HTMLElement, listener: ListenerFor<K>): void {
  element.removeEventListener(listener.type, listener.handler, {
    capture: listener.capture ?? false,
  });
}
