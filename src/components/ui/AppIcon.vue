<script setup lang="ts">
import { computed } from 'vue';
import { ICON_PATHS, type IconName } from '@/components/ui/icon-paths';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  name: IconName;
  filled?: boolean;
};

const { name, filled = false } = defineProps<Props>();

const path = computed(() => ICON_PATHS[name]);
const fill = computed(() => (filled ? 'currentColor' : 'none'));
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :fill="fill"
    :data-testid="TEST_IDS.appIcon"
    :data-icon="name"
  >
    <path :d="path" />
  </svg>
</template>

<style scoped>
.icon {
  --icon-size: var(--size-icon);

  flex: none;
  width: var(--icon-size);
  height: var(--icon-size);
}
</style>
