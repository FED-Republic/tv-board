<script setup lang="ts">
import { EAGER_POSTER_COUNT } from '@/components/show/eager-posters';
import ShowCard from '@/components/show/ShowCard.vue';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  shows: readonly Show[];
  eager?: boolean;
};

const { shows, eager = false } = defineProps<Props>();

const isEagerAt = (index: number): boolean => eager && index < EAGER_POSTER_COUNT;
</script>

<template>
  <ul class="grid" :data-testid="TEST_IDS.showGrid">
    <li v-for="(show, index) in shows" :key="show.id">
      <ShowCard :show :eager="isEagerAt(index)" />
    </li>
  </ul>
</template>

<style scoped>
/* A parent may fix the column count (with a smaller track minimum) or cap the width via tokens. */
.grid {
  display: grid;
  grid-template-columns: repeat(
    var(--grid-columns, auto-fill),
    minmax(var(--grid-track-min, var(--card-w)), 1fr)
  );
  gap: var(--size-6) var(--row-gap);
  max-width: var(--grid-max-w, none);
  container-type: inline-size;
}
</style>
