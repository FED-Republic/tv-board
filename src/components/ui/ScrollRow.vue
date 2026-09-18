<script setup lang="ts" generic="T">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import IconButton from '@/components/ui/IconButton.vue';
import RowPages from '@/components/ui/RowPages.vue';
import { useDragScroll } from '@/composables/useDragScroll';
import { useElementListeners } from '@/composables/useElementListeners';
import { useRowScroll } from '@/composables/useRowScroll';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  items: readonly T[];
  itemKey: (item: T) => PropertyKey;
  label: string;
  filling?: boolean;
};

const { items, itemKey, label, filling = false } = defineProps<Props>();
defineSlots<{
  heading(): unknown;
  tools?(): unknown;
  status?(): unknown;
  item(props: { item: T; index: number }): unknown;
}>();

const scroller = useTemplateRef<HTMLElement>('scroller');

const {
  canScrollPrev,
  canScrollNext,
  pageCount,
  currentPage,
  scrollPrev,
  scrollNext,
  scrollToPage,
  onKeydown,
  update,
} = useRowScroll(scroller);
const { isDragging, onPointerDown, onPointerMove, onPointerUp, onClickCapture } =
  useDragScroll(scroller);

const prevLabel = computed(() => `Scroll ${label} back`);
const nextLabel = computed(() => `Scroll ${label} forward`);
// The parent section is already named `label`; the scroller group needs its own name.
const regionLabel = computed(() => `${label} row`);

async function onContentChanged(): Promise<void> {
  // The new cards, or the removed spinner, must be laid out before the row is measured again.
  await nextTick();
  update();
}

useElementListeners(scroller, [
  { type: 'keydown', handler: onKeydown },
  { type: 'pointerdown', handler: onPointerDown },
  { type: 'pointermove', handler: onPointerMove },
  { type: 'pointerup', handler: onPointerUp },
  { type: 'pointercancel', handler: onPointerUp },
  { type: 'pointerleave', handler: onPointerUp },
  { type: 'click', handler: onClickCapture, capture: true },
]);

watch([() => items.length, () => filling], onContentChanged);
</script>

<template>
  <div class="row" :data-testid="TEST_IDS.scrollRow">
    <div class="strip">
      <slot name="heading" />
      <div class="tools">
        <div class="arrows">
          <IconButton
            icon="chevron-left"
            :label="prevLabel"
            :disabled="!canScrollPrev"
            :data-testid="TEST_IDS.scrollRowPrev"
            @click="scrollPrev"
          />
          <IconButton
            icon="chevron-right"
            :label="nextLabel"
            :disabled="!canScrollNext"
            :data-testid="TEST_IDS.scrollRowNext"
            @click="scrollNext"
          />
        </div>
        <slot name="tools" />
      </div>
    </div>

    <slot name="status" />

    <div
      ref="scroller"
      class="scroller"
      role="group"
      tabindex="0"
      :class="{ dragging: isDragging, filling }"
      :aria-label="regionLabel"
      :data-testid="TEST_IDS.scrollRowList"
    >
      <ul class="list">
        <li v-for="(item, index) in items" :key="itemKey(item)" class="item">
          <slot name="item" :item :index />
        </li>
        <!-- The page announces the loading once; a spinner per row would announce it six times. -->
        <li v-if="filling" class="item loading" aria-hidden="true">
          <span class="spinner" :data-testid="TEST_IDS.scrollRowLoading" />
        </li>
      </ul>
    </div>

    <RowPages
      class="pages"
      :label
      :count="pageCount"
      :current="currentPage"
      @select="scrollToPage"
    />
  </div>
</template>

<style scoped>
.row {
  --row-edge-pad: var(--size-2);

  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  container-type: inline-size;
}

.strip {
  display: flex;
  gap: var(--size-4);
  align-items: flex-end;
  padding-inline: var(--page-gutter);
}

.tools {
  display: flex;
  gap: var(--size-2);
  margin-inline-start: auto;
}

/* Arrows exist for pointer devices only; touch users scroll the row itself. */
.arrows {
  display: none;
  gap: var(--size-2);
}

.scroller {
  padding-block: var(--row-edge-pad);
  padding-inline: var(--page-gutter);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--page-gutter);
  scrollbar-width: none;
  touch-action: pan-x pan-y;

  &.filling,
  &.dragging {
    scroll-snap-type: none;
  }

  &.dragging {
    cursor: grabbing;
    user-select: none;
  }
}

.list {
  display: flex;
  gap: var(--row-gap);
}

.item {
  flex: none;
  width: var(--card-w);
  scroll-snap-align: start;
}

.loading {
  display: grid;
  place-items: center;
  aspect-ratio: var(--poster-ratio);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

/* The dots' full-size hit areas would otherwise add a whole target of height under the row. */
.pages {
  margin-block: calc(-1 * var(--size-3));
}

.spinner {
  width: var(--spinner-size);
  height: var(--spinner-size);
  border: var(--hairline-w) solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: var(--radius-pill);
  animation: spin var(--duration-spin) linear infinite;
}

@media (hover: hover) and (pointer: fine) {
  .arrows {
    display: flex;
  }

  .scroller {
    cursor: grab;
  }
}
</style>
