import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { DRAG_THRESHOLD_PX, useDragScroll } from '@/composables/useDragScroll';
import { withSetup } from './with-setup';

const START_SCROLL_LEFT_PX = 50;
const START_CLIENT_X_PX = 100;

type DragHarness = {
  readonly element: HTMLElement;
  readonly drag: ReturnType<typeof useDragScroll>;
};

function aDraggableRow(): DragHarness {
  const element = document.createElement('div');

  Object.defineProperty(element, 'scrollLeft', {
    value: START_SCROLL_LEFT_PX,
    writable: true,
    configurable: true,
  });
  document.body.append(element);

  const scroller = ref<HTMLElement | null>(element);
  const { result } = withSetup(() => useDragScroll(scroller));

  return { element, drag: result };
}

const pointerDown = (options: PointerEventInit): PointerEvent =>
  new PointerEvent('pointerdown', { button: 0, clientX: START_CLIENT_X_PX, ...options });

const pointerMoveTo = (clientX: number): PointerEvent =>
  new PointerEvent('pointermove', { pointerType: 'mouse', clientX });

const mouseDown = (): PointerEvent => pointerDown({ pointerType: 'mouse' });

const click = (): MouseEvent => new MouseEvent('click', { bubbles: true, cancelable: true });

/** Presses, moves the pointer by `distancePx` to the left, and releases. */
function dragBy(harness: DragHarness, distancePx: number): void {
  harness.drag.onPointerDown(mouseDown());
  harness.drag.onPointerMove(pointerMoveTo(START_CLIENT_X_PX - distancePx));
  harness.drag.onPointerUp();
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('useDragScroll', () => {
  describe('when the pointer is a mouse', () => {
    it('given the left button, when pressed, then the row is dragging', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(mouseDown());

      expect(harness.drag.isDragging.value).toBe(true);
    });

    it('given a press, when the pointer moves left, then the row scrolls right', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(mouseDown());
      harness.drag.onPointerMove(pointerMoveTo(START_CLIENT_X_PX - 30));

      expect(harness.element.scrollLeft).toBe(START_SCROLL_LEFT_PX + 30);
    });

    it('given a press, when the pointer moves right, then the row scrolls back', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(mouseDown());
      harness.drag.onPointerMove(pointerMoveTo(START_CLIENT_X_PX + 20));

      expect(harness.element.scrollLeft).toBe(START_SCROLL_LEFT_PX - 20);
    });

    it('given a drag, when the pointer is released, then the row stops dragging', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(mouseDown());
      harness.drag.onPointerUp();

      expect(harness.drag.isDragging.value).toBe(false);
    });
  });

  describe('when the pointer cannot drag', () => {
    it('given a touch pointer, when pressed, then the row is not dragging', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(pointerDown({ pointerType: 'touch' }));

      expect(harness.drag.isDragging.value).toBe(false);
    });

    it('given a pen pointer, when pressed, then the row is not dragging', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(pointerDown({ pointerType: 'pen' }));

      expect(harness.drag.isDragging.value).toBe(false);
    });

    it('given the right button, when pressed, then the row is not dragging', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(pointerDown({ pointerType: 'mouse', button: 2 }));

      expect(harness.drag.isDragging.value).toBe(false);
    });

    it('given a touch pointer, when the pointer moves, then the row does not scroll', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerDown(pointerDown({ pointerType: 'touch' }));
      harness.drag.onPointerMove(pointerMoveTo(START_CLIENT_X_PX - 30));

      expect(harness.element.scrollLeft).toBe(START_SCROLL_LEFT_PX);
    });

    it('given no press, when the pointer moves, then the row does not scroll', () => {
      const harness = aDraggableRow();

      harness.drag.onPointerMove(pointerMoveTo(START_CLIENT_X_PX - 30));

      expect(harness.element.scrollLeft).toBe(START_SCROLL_LEFT_PX);
    });
  });

  describe('when a click follows a drag', () => {
    it('given a drag past the threshold, when the click arrives, then it is prevented', () => {
      const harness = aDraggableRow();
      dragBy(harness, 20);
      const event = click();

      harness.drag.onClickCapture(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('given a drag past the threshold, when the click arrives, then it stops bubbling', () => {
      const harness = aDraggableRow();
      dragBy(harness, 20);
      const event = click();
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      harness.drag.onClickCapture(event);

      expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it('given one suppressed click, when a second click arrives, then it passes through', () => {
      const harness = aDraggableRow();
      dragBy(harness, 20);
      harness.drag.onClickCapture(click());
      const second = click();

      harness.drag.onClickCapture(second);

      expect(second.defaultPrevented).toBe(false);
    });
  });

  describe('when a click follows a press that barely moved', () => {
    it('given a move of the threshold, when the click arrives, then it passes through', () => {
      const harness = aDraggableRow();
      dragBy(harness, DRAG_THRESHOLD_PX);
      const event = click();

      harness.drag.onClickCapture(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('given a press without a move, when the click arrives, then it passes through', () => {
      const harness = aDraggableRow();
      harness.drag.onPointerDown(mouseDown());
      harness.drag.onPointerUp();
      const event = click();

      harness.drag.onClickCapture(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('given no pointer at all, when the click arrives, then it passes through', () => {
      const harness = aDraggableRow();
      const event = click();

      harness.drag.onClickCapture(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('when a drag ended off the row', () => {
    it('given a drag whose click never arrived, when the next press is a plain click, then it passes through', () => {
      const harness = aDraggableRow();
      dragBy(harness, 20);

      harness.drag.onPointerDown(mouseDown());
      harness.drag.onPointerUp();
      const event = click();
      harness.drag.onClickCapture(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('when the element is missing', () => {
    it('given no element, when pressed, then nothing is thrown', () => {
      const scroller = ref<HTMLElement | null>(null);
      const { result } = withSetup(() => useDragScroll(scroller));

      expect(() => result.onPointerDown(mouseDown())).not.toThrow();
    });

    it('given no element, when the pointer moves, then nothing is thrown', () => {
      const scroller = ref<HTMLElement | null>(null);
      const { result } = withSetup(() => useDragScroll(scroller));

      result.onPointerDown(mouseDown());

      expect(() => result.onPointerMove(pointerMoveTo(10))).not.toThrow();
    });
  });
});
