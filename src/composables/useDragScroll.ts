import { type Ref, ref } from 'vue';

export const DRAG_THRESHOLD_PX = 4;

type DragScroll = {
  readonly isDragging: Ref<boolean>;
  readonly onPointerDown: (event: PointerEvent) => void;
  readonly onPointerMove: (event: PointerEvent) => void;
  readonly onPointerUp: () => void;
  readonly onClickCapture: (event: MouseEvent) => void;
};

const PRIMARY_BUTTON = 0;

/**
 * Mouse drag-to-scroll for a row. Touch and pen scroll natively and are ignored; a drag past
 * the threshold swallows the click that would otherwise open the card under the pointer.
 */
export function useDragScroll(scroller: Ref<HTMLElement | null>): DragScroll {
  const isDragging = ref(false);

  let startClientX = 0;
  let startScrollLeft = 0;
  let hasMoved = false;
  let shouldSuppressClick = false;

  function onPointerDown(event: PointerEvent): void {
    const element = scroller.value;
    const isMouseDrag = event.pointerType === 'mouse' && event.button === PRIMARY_BUTTON;

    // A drag that ended off the row (pointerleave) never saw its click; the next press starts clean.
    shouldSuppressClick = false;

    if (element === null || !isMouseDrag) {
      return;
    }

    isDragging.value = true;
    hasMoved = false;
    startClientX = event.clientX;
    startScrollLeft = element.scrollLeft;
  }

  function onPointerMove(event: PointerEvent): void {
    const element = scroller.value;

    if (element === null || !isDragging.value) {
      return;
    }

    const distance = event.clientX - startClientX;

    if (Math.abs(distance) > DRAG_THRESHOLD_PX) {
      hasMoved = true;
    }

    element.scrollLeft = startScrollLeft - distance;
  }

  function onPointerUp(): void {
    if (!isDragging.value) {
      return;
    }

    isDragging.value = false;
    shouldSuppressClick = hasMoved;
    hasMoved = false;
  }

  function onClickCapture(event: MouseEvent): void {
    if (!shouldSuppressClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    shouldSuppressClick = false;
  }

  return { isDragging, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}
