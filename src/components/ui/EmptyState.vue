<script setup lang="ts">
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  heading: string;
  body: string;
};

const { heading, body } = defineProps<Props>();
defineSlots<{ action?(): unknown }>();
</script>

<template>
  <div class="empty" :data-testid="TEST_IDS.emptyState">
    <h2 class="heading">{{ heading }}</h2>
    <p class="body">{{ body }}</p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  align-items: flex-start;
  max-width: var(--empty-measure);
  padding-block: var(--size-12);
}

.heading {
  font-size: var(--text-heading);
  font-weight: var(--font-weight-medium);
  line-height: 1.25;
  letter-spacing: var(--tracking-tight);
  text-wrap: pretty;
}

.body {
  color: var(--color-text-muted);
}
</style>
