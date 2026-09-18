<script setup lang="ts">
import { computed, useId } from 'vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import { GENRES, type Genre, isGenre, OTHER_GENRE } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

const model = defineModel<Genre | null>({ required: true });

const ALL_GENRES_VALUE = '';
const OPTIONS: readonly Genre[] = [...GENRES, OTHER_GENRE];

const selectId = useId();

const selected = computed({
  get: () => model.value ?? ALL_GENRES_VALUE,
  set: (value: string) => {
    model.value = isGenre(value) ? value : null;
  },
});
</script>

<template>
  <label class="field" :for="selectId">
    <span class="visually-hidden">Filter by genre</span>
    <select :id="selectId" v-model="selected" class="select" :data-testid="TEST_IDS.genreSelect">
      <option :value="ALL_GENRES_VALUE">All genres</option>
      <option v-for="genre in OPTIONS" :key="genre" :value="genre">{{ genre }}</option>
    </select>
    <AppIcon class="chevron" name="chevron-down" />
  </label>
</template>

<style scoped>
.field {
  --select-icon-inset: 0.875rem;
  --select-padding-end: 2.5rem;

  position: relative;
  display: flex;
  align-items: center;
}

.select {
  width: 100%;
  height: var(--size-target);
  padding-inline: var(--size-4) var(--select-padding-end);
  border: var(--border-w) solid var(--color-border-control);
  border-radius: var(--radius-md);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  background: var(--color-surface);
  appearance: none;
  cursor: pointer;

  &:focus-visible {
    border-color: var(--color-focus);
  }
}

.chevron {
  --icon-size: var(--size-icon-sm);

  position: absolute;
  inset-inline-end: var(--select-icon-inset);
  color: var(--color-text-muted);
  pointer-events: none;
}
</style>
