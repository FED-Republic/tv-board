<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { TEST_IDS } from '@/testing/test-ids';
</script>

<template>
  <section :data-testid="TEST_IDS.notFoundPage">
    <h1 class="title">Page not found</h1>
    <p class="subtitle">There is nothing at this address.</p>
    <RouterLink class="back-link" :to="{ name: 'home' }">Back to the dashboard</RouterLink>
  </section>
</template>

<style scoped>
.title {
  font-size: var(--text-heading);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
}

.subtitle {
  margin-block-start: var(--size-2);
  color: var(--color-text-muted);
}

.back-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--size-target);
  margin-block-start: var(--size-4);
  color: var(--color-accent);
}
</style>
