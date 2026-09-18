<script setup lang="ts">
import { computed } from 'vue';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  label: string;
  count: number;
  current: number;
};

const { label, count, current } = defineProps<Props>();
const emit = defineEmits<{ select: [page: number] }>();

/** More dots than this stop being scannable and overflow a phone-width row. */
const MAX_DOTS = 8;

const groupLabel = computed(() => `${label} pages`);
const hasPages = computed(() => count > 1);
const hasTooManyPages = computed(() => count > MAX_DOTS);
const pages = computed(() => Array.from({ length: count }, (_unused, page) => page));

const pageLabel = (page: number): string => `Page ${page + 1} of ${count}`;

const rangeText = computed(() => pageLabel(current));
const currentAt = (page: number): 'page' | undefined => (page === current ? 'page' : undefined);

function onSelect(page: number): void {
  emit('select', page);
}
</script>

<template>
  <p v-if="hasTooManyPages" class="range" :data-testid="TEST_IDS.rowPagesRange">{{ rangeText }}</p>
  <div
    v-else-if="hasPages"
    class="dots"
    role="group"
    :aria-label="groupLabel"
    :data-testid="TEST_IDS.rowPages"
  >
    <button
      v-for="page in pages"
      :key="page"
      class="page"
      type="button"
      :aria-label="pageLabel(page)"
      :aria-current="currentAt(page)"
      :data-testid="TEST_IDS.rowPagesPage"
      @click="onSelect(page)"
    >
      <span class="dot" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
/* One dot per viewport of cards, each with a full-size hit area. */
.dots {
  display: flex;
  justify-content: center;
}

.range {
  min-height: var(--size-target);
  font-size: var(--text-meta);
  font-weight: var(--font-weight-medium);
  line-height: var(--size-target);
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.page {
  display: grid;
  flex: 1 1 0;
  place-items: center;
  min-width: var(--dot-target-min-w);
  max-width: var(--size-target);
  height: var(--size-target);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;

  /* The current page differs in length as well as colour, so it never reads by hue alone. */
  &[aria-current='page'] .dot {
    width: var(--dot-size-current);
    background: var(--color-accent);
  }
}

.dot {
  width: var(--dot-size);
  height: var(--dot-size);
  border-radius: var(--radius-pill);
  background: var(--color-text-muted);
  transition:
    width var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}
</style>
