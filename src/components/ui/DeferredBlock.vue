<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useNearViewport } from '@/composables/useNearViewport';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  eager?: boolean;
};

const { eager = false } = defineProps<Props>();
defineSlots<{
  placeholder(): unknown;
  default(): unknown;
}>();

const block = useTemplateRef<HTMLElement>('block');

const { isNear } = useNearViewport(block, { eager: () => eager });
</script>

<template>
  <div ref="block" :data-testid="TEST_IDS.deferredBlock" :data-rendered="isNear">
    <slot v-if="isNear" />
    <slot v-else name="placeholder" />
  </div>
</template>
