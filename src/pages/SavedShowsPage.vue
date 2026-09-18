<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import ShowGrid from '@/components/show/ShowGrid.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorPanel from '@/components/ui/ErrorPanel.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import { useGenreFilter } from '@/composables/useGenreFilter';
import { useSavedShows } from '@/composables/useSavedShows';
import { toDataState } from '@/domain/async-state';
import { describeFailedState } from '@/domain/load-error';
import type { SavedKind } from '@/domain/saved';
import { describeShowCount } from '@/domain/show-count';
import { useSavedStore } from '@/stores/saved';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  kind: SavedKind;
};

const { kind } = defineProps<Props>();

const saved = useSavedStore();
const { shows, retry } = useSavedShows(() => kind);
const { genre } = useGenreFilter();

const COPY: Readonly<Record<SavedKind, { heading: string; empty: string; filtered: string }>> = {
  bookmarks: {
    heading: 'Bookmarked',
    empty: 'Nothing bookmarked yet.',
    filtered: 'Nothing bookmarked in',
  },
  likes: { heading: 'Liked', empty: 'Nothing liked yet.', filtered: 'Nothing liked in' },
};
const SKELETON_CARDS = [0, 1, 2, 3] as const;

const copy = computed(() => COPY[kind]);
const dataState = computed(() => toDataState(shows.value));
const isLoading = computed(() => shows.value.status === 'loading');
const hasFailed = computed(() => shows.value.status === 'error');
const failureBody = computed(() => describeFailedState(shows.value));
const loadedShows = computed(() => (shows.value.status === 'success' ? shows.value.data : []));
const hasShows = computed(() => loadedShows.value.length > 0);
const isEmpty = computed(() => dataState.value === 'empty');
const hasNothingSaved = computed(() => saved.idsOf(kind).size === 0);
const countText = computed(() => describeShowCount(loadedShows.value.length));
const emptyHeading = computed(() => {
  if (hasNothingSaved.value || genre.value === null) {
    return copy.value.empty;
  }

  return `${copy.value.filtered} ${genre.value} yet.`;
});
</script>

<template>
  <section
    class="page"
    :data-testid="TEST_IDS.savedShowsPage"
    :data-state="dataState"
    :data-kind="kind"
  >
    <div class="strip">
      <h1 class="heading heading-display">{{ copy.heading }}</h1>
      <p class="count" aria-live="polite">
        <span v-if="hasShows">{{ countText }}</span>
      </p>
    </div>

    <ul v-if="isLoading" class="skeleton" aria-busy="true">
      <li v-for="card in SKELETON_CARDS" :key="card">
        <SkeletonCard />
      </li>
    </ul>

    <ErrorPanel
      v-else-if="hasFailed"
      title="Your saved shows didn't load."
      :body="failureBody"
      @retry="retry"
    />

    <ShowGrid v-else-if="hasShows" :shows="loadedShows" :data-testid="TEST_IDS.savedShowsGrid" />

    <EmptyState
      v-else-if="isEmpty"
      body="Open a show and save it here to find it again."
      :heading="emptyHeading"
      :data-testid="TEST_IDS.savedShowsEmpty"
    >
      <template #action>
        <RouterLink class="action" :to="{ name: 'home' }" :data-testid="TEST_IDS.emptyStateAction">
          Browse genres
        </RouterLink>
      </template>
    </EmptyState>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--size-6);
}

.strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: flex-end;
}

.count {
  --count-baseline-offset: 0.45em;

  padding-block-end: var(--count-baseline-offset);
  font-size: var(--text-meta);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  color: var(--color-text-muted);
}

.skeleton {
  display: grid;
  grid-template-columns: var(--grid-card-track);
  gap: var(--size-6) var(--row-gap);
  animation: pulse var(--duration-pulse) ease-in-out infinite;
  container-type: inline-size;
}

.action {
  display: inline-flex;
  align-items: center;
  min-height: var(--size-target);
  padding-inline: var(--size-6);
  border-radius: var(--radius-md);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  background: var(--color-accent);
  color: var(--color-ink);
}

@media (hover: hover) and (pointer: fine) {
  .action:hover {
    background: var(--color-accent-hover);
  }
}
</style>
