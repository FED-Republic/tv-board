<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import type { IconName } from '@/components/ui/icon-paths';
import { useTheme } from '@/composables/useTheme';
import { TEST_IDS } from '@/testing/test-ids';

const { isDark, toggle } = useTheme();

const label = computed(() => (isDark.value ? 'Switch to light theme' : 'Switch to dark theme'));
const icon = computed<IconName>(() => (isDark.value ? 'sun' : 'moon'));
</script>

<template>
  <button
    class="toggle"
    type="button"
    :aria-label="label"
    :title="label"
    :data-testid="TEST_IDS.themeToggle"
    @click="toggle"
  >
    <AppIcon :name="icon" />
  </button>
</template>

<style scoped>
.toggle {
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
}

@media (hover: hover) and (pointer: fine) {
  .toggle:hover {
    background: var(--color-surface-2);
  }
}
</style>
