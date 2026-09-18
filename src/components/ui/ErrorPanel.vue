<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  title: string;
  body: string;
};

const { title, body } = defineProps<Props>();
const emit = defineEmits<{ retry: [] }>();

function onRetry(): void {
  emit('retry');
}
</script>

<template>
  <div class="panel" role="alert" :data-testid="TEST_IDS.errorPanel">
    <div class="text">
      <p class="title">{{ title }}</p>
      <p class="body">{{ body }}</p>
    </div>
    <AppButton variant="primary" :data-testid="TEST_IDS.errorPanelRetry" @click="onRetry">
      Retry
    </AppButton>
  </div>
</template>

<style scoped>
.panel {
  --panel-text-min-w: 16rem;

  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4) var(--size-6);
  align-items: center;
  padding: var(--size-6);
  border: var(--border-w) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.text {
  display: flex;
  flex: 1 1 var(--panel-text-min-w);
  flex-direction: column;
  gap: var(--size-1);
}

.title {
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
}

.body {
  font-size: var(--text-meta);
  line-height: 1.4;
  color: var(--color-text-muted);
}
</style>
