<script setup lang="ts">
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  label: string;
};

const { label } = defineProps<Props>();
</script>

<template>
  <span class="chip" :data-testid="TEST_IDS.genreChip">{{ label }}</span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  min-height: var(--chip-h);
  padding-inline: var(--size-3);
  border: var(--border-w) solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-meta);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
}
</style>
