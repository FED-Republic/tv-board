<script setup lang="ts">
import { TEST_IDS } from '@/testing/test-ids';
</script>

<template>
  <div class="skeleton" aria-hidden="true" :data-testid="TEST_IDS.skeletonCard">
    <div class="poster" />
    <div class="line title" />
    <div class="line meta" />
  </div>
</template>

<style scoped>
/* Geometry mirrors ShowCard exactly, so nothing shifts when the real card replaces it. */
.skeleton {
  --skeleton-title-w: 80%;
  --skeleton-meta-w: 45%;

  display: flex;
  flex-direction: column;
  gap: var(--size-2);
  width: 100%;
  animation: pulse var(--duration-pulse) ease-in-out infinite;
}

.poster {
  width: 100%;
  aspect-ratio: var(--poster-ratio);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.line {
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.title {
  width: var(--skeleton-title-w);
  height: var(--text-title);
}

.meta {
  width: var(--skeleton-meta-w);
  height: var(--text-meta);
}
</style>
