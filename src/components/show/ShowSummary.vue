<script setup lang="ts">
import { computed } from 'vue';
import { sanitizeSummary } from '@/domain/summary';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  html: string | null;
};

const { html } = defineProps<Props>();

const safeHtml = computed(() => sanitizeSummary(html));
const hasSummary = computed(() => safeHtml.value !== '');
</script>

<template>
  <!-- The only `v-html` in the codebase; the markup went through `sanitizeSummary` first. -->
  <div v-if="hasSummary" class="summary" :data-testid="TEST_IDS.showSummary" v-html="safeHtml" />
</template>

<style scoped>
.summary {
  max-width: var(--prose-measure);
  font-size: var(--text-prose);
  line-height: var(--leading-prose);
  text-wrap: pretty;

  :deep(p + p) {
    margin-block-start: var(--size-4);
  }
}
</style>
