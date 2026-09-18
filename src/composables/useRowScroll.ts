import { onScopeDispose, type Ref, ref, watch } from 'vue';
import { preferredScrollBehavior } from '@/lib/scroll-behavior';

type RowScrollOptions = {
  readonly itemSelector?: string;
};

type RowScroll = {
  readonly canScrollPrev: Ref<boolean>;
  readonly canScrollNext: Ref<boolean>;
  readonly pageCount: Ref<number>;
  readonly currentPage: Ref<number>;
  readonly scrollPrev: () => void;
  readonly scrollNext: () => void;
  readonly scrollToPage: (page: number) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly update: () => void;
};

const DEFAULT_ITEM_SELECTOR = 'a[href]';
/** Fractional scroll positions at a fractional zoom never quite reach `scrollWidth`. */
const SCROLL_END_TOLERANCE_PX = 2;

/**
 * Arrow buttons, page dots and keyboard navigation for a horizontal row: a page is one viewport
 * of cards, arrow keys move between items, Home and End jump to the ends.
 */
export function useRowScroll(
  scroller: Ref<HTMLElement | null>,
  options: RowScrollOptions = {},
): RowScroll {
  const { itemSelector = DEFAULT_ITEM_SELECTOR } = options;
  const canScrollPrev = ref(false);
  const canScrollNext = ref(false);
  const pageCount = ref(0);
  const currentPage = ref(0);

  let resizeFrame: number | null = null;

  function update(): void {
    const element = scroller.value;

    if (element === null) {
      canScrollPrev.value = false;
      canScrollNext.value = false;
      pageCount.value = 0;
      currentPage.value = 0;
      return;
    }

    canScrollPrev.value = scrollOffset(element) > 0;
    canScrollNext.value = !isAtEnd(element);
    pageCount.value = countPages(element);
    currentPage.value = nearestPage(element, pageCount.value);
  }

  function scrollByViewport(direction: 1 | -1): void {
    const element = scroller.value;

    if (element === null) {
      return;
    }

    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: preferredScrollBehavior(),
    });
  }

  const scrollPrev = (): void => scrollByViewport(-1);
  const scrollNext = (): void => scrollByViewport(1);

  function scrollToPage(page: number): void {
    const element = scroller.value;

    if (element === null) {
      return;
    }

    element.scrollTo({ left: pageStart(element, page), behavior: preferredScrollBehavior() });
  }

  function onKeydown(event: KeyboardEvent): void {
    const element = scroller.value;

    if (element === null) {
      return;
    }

    const items = [...element.querySelectorAll<HTMLElement>(itemSelector)];
    const current = items.findIndex((item) => item.contains(document.activeElement));
    const target = targetIndexFor(event.key, current, items.length);

    if (target === null) {
      return;
    }

    event.preventDefault();
    items[target]?.focus();
  }

  // Resize fires per pixel while a window is dragged; one measurement per frame is enough.
  function onResize(): void {
    if (resizeFrame !== null) {
      return;
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      update();
    });
  }

  watch(
    scroller,
    (element, previous) => {
      previous?.removeEventListener('scroll', update);
      element?.addEventListener('scroll', update, { passive: true });
      update();
    },
    { immediate: true },
  );

  window.addEventListener('resize', onResize);

  onScopeDispose(() => {
    scroller.value?.removeEventListener('scroll', update);
    window.removeEventListener('resize', onResize);

    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }
  });

  return {
    canScrollPrev,
    canScrollNext,
    pageCount,
    currentPage,
    scrollPrev,
    scrollNext,
    scrollToPage,
    onKeydown,
    update,
  };
}

const MIN_OVERFLOWING_PAGE_COUNT = 2;

/** How far the row is scrolled from its start; `scrollLeft` counts negative in a RTL row. */
const scrollOffset = (element: HTMLElement): number => Math.abs(element.scrollLeft);

function isAtEnd(element: HTMLElement): boolean {
  const scrollEnd = scrollOffset(element) + element.clientWidth;

  return scrollEnd >= element.scrollWidth - SCROLL_END_TOLERANCE_PX;
}

function isOverflowing(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth + SCROLL_END_TOLERANCE_PX;
}

/**
 * Viewports of content, none for an unmeasured element. Rounded like `nearestPage`, so an end
 * sliver shorter than half a viewport joins the last page instead of getting a dot that is never
 * current; a row that overflows at all has two pages, so its dots agree with its arrows.
 */
function countPages(element: HTMLElement): number {
  if (element.clientWidth === 0) {
    return 0;
  }

  const rounded = Math.round(element.scrollWidth / element.clientWidth);

  if (isOverflowing(element)) {
    return Math.max(rounded, MIN_OVERFLOWING_PAGE_COUNT);
  }

  return rounded;
}

/** The last page ends the row, whatever its width; every other page starts a whole viewport on. */
function pageStart(element: HTMLElement, page: number): number {
  const isLastPage = page === countPages(element) - 1;

  if (isLastPage) {
    return element.scrollWidth - element.clientWidth;
  }

  return page * element.clientWidth;
}

/** The page under the viewport; the end of the row is always its last page. */
function nearestPage(element: HTMLElement, count: number): number {
  if (count === 0) {
    return 0;
  }

  if (isAtEnd(element)) {
    return count - 1;
  }

  const nearest = Math.round(scrollOffset(element) / element.clientWidth);

  return Math.min(nearest, count - 1);
}

/** Index of the item to focus for a navigation key, or `null` for any other key. */
function targetIndexFor(key: string, current: number, count: number): number | null {
  if (count === 0) {
    return null;
  }

  switch (key) {
    case 'ArrowRight':
      return Math.min(current + 1, count - 1);
    case 'ArrowLeft':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
