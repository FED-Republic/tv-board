<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue';
import type { IconName } from '@/components/ui/icon-paths';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  label: string;
  icon: IconName;
  disabled?: boolean;
};

const { label, icon, disabled = false } = defineProps<Props>();
</script>

<template>
  <button
    class="icon-button"
    type="button"
    :aria-label="label"
    :disabled
    :data-testid="TEST_IDS.iconButton"
  >
    <AppIcon :name="icon" />
  </button>
</template>

<style scoped>
.icon-button {
  display: grid;
  place-items: center;
  width: var(--size-target);
  height: var(--size-target);
  padding: 0;
  border: var(--border-w) solid var(--color-border-control);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);

  &:disabled {
    background: transparent;
    color: var(--color-text-muted);
    opacity: var(--opacity-disabled);
    cursor: default;
  }
}

@media (hover: hover) and (pointer: fine) {
  .icon-button:enabled:hover {
    background: var(--color-surface-2);
  }
}
</style>
