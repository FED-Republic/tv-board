<script setup lang="ts">
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  variant?: 'primary' | 'secondary';
};

const { variant = 'secondary' } = defineProps<Props>();
</script>

<template>
  <button class="button" type="button" :class="variant" :data-testid="TEST_IDS.appButton">
    <slot />
  </button>
</template>

<style scoped>
.button {
  display: inline-flex;
  gap: var(--size-2);
  align-items: center;
  justify-content: center;
  min-height: var(--size-target);
  padding-inline: var(--size-6);
  border: var(--border-w) solid var(--color-border-control);
  border-radius: var(--radius-md);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.primary {
  border-color: transparent;
  background: var(--color-accent);
  color: var(--color-ink);
}

.secondary {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (hover: hover) and (pointer: fine) {
  .primary:hover {
    background: var(--color-accent-hover);
  }

  .secondary:hover {
    background: var(--color-surface-2);
  }
}
</style>
