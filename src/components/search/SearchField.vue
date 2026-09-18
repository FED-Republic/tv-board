<script setup lang="ts">
import { onMounted, onUnmounted, useId, useTemplateRef } from 'vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import { isTypingTarget } from '@/lib/typing-target';
import { TEST_IDS } from '@/testing/test-ids';

const model = defineModel<string>({ required: true });

const SHORTCUT_KEY = '/';

const inputId = useId();
const input = useTemplateRef<HTMLInputElement>('input');

// `/` focuses the field from anywhere except another text field, so keyboard users reach
// search without tabbing through the header.
function onShortcut(event: KeyboardEvent): void {
  if (event.key !== SHORTCUT_KEY || isTypingTarget(event.target)) {
    return;
  }

  event.preventDefault();
  input.value?.focus();
}

onMounted(() => window.addEventListener('keydown', onShortcut));
onUnmounted(() => window.removeEventListener('keydown', onShortcut));
</script>

<template>
  <label class="field" :for="inputId">
    <span class="visually-hidden">Search shows by title</span>
    <AppIcon class="icon" name="search" />
    <input
      :id="inputId"
      ref="input"
      v-model="model"
      class="input"
      type="search"
      placeholder="Search shows"
      autocomplete="off"
      enterkeyhint="search"
      :data-testid="TEST_IDS.searchField"
    />
  </label>
</template>

<style scoped>
.field {
  --search-icon-inset: 0.875rem;
  --search-padding-start: 2.625rem;

  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.icon {
  position: absolute;
  inset-inline-start: var(--search-icon-inset);
  color: var(--color-text-muted);
  pointer-events: none;
}

.input {
  width: 100%;
  height: var(--size-target);
  padding-inline: var(--search-padding-start) var(--size-4);
  border: var(--border-w) solid var(--color-border-control);
  border-radius: var(--radius-md);
  font-size: var(--text-title);
  font-weight: var(--font-weight-medium);
  background: var(--color-surface);

  &::placeholder {
    color: var(--color-text-muted);
  }

  &:focus-visible {
    border-color: var(--color-focus);
  }
}
</style>
