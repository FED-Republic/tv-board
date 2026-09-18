<script setup lang="ts">
import { computed } from 'vue';
import type { ShowDetail } from '@/domain/show';
import { describeShow } from '@/domain/show-facts';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  show: ShowDetail;
};

const { show } = defineProps<Props>();

const facts = computed(() => describeShow(show));
</script>

<template>
  <dl class="facts" :data-testid="TEST_IDS.showFacts">
    <div v-for="fact in facts" :key="fact.term" class="fact">
      <dt class="term">{{ fact.term }}</dt>
      <dd class="description">{{ fact.description }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.facts {
  --fact-min-w: 9.5rem;

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--fact-min-w), 1fr));
  gap: var(--size-4) var(--size-6);
  font-size: var(--text-title);
  line-height: 1.4;
}

.fact {
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
}

.term {
  font-size: var(--text-meta);
  color: var(--color-text-muted);
}

.description {
  font-weight: var(--font-weight-semibold);
}
</style>
