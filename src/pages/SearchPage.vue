<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import ShowGrid from '@/components/show/ShowGrid.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorPanel from '@/components/ui/ErrorPanel.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import { useGenreFilter } from '@/composables/useGenreFilter';
import { useSearchResults } from '@/composables/useSearchResults';
import { toDataState } from '@/domain/async-state';
import { describeFailedState } from '@/domain/load-error';
import { describeShowCount } from '@/domain/show-count';
import { TEST_IDS } from '@/testing/test-ids';

const { query, shows, retry } = useSearchResults();
const { genre } = useGenreFilter();

const SKELETON_CARDS = [0, 1, 2, 3, 4, 5] as const;

const dataState = computed(() => toDataState(shows.value));
const isIdle = computed(() => shows.value.status === 'idle');
const isSearching = computed(() => shows.value.status === 'loading');
const hasFailed = computed(() => shows.value.status === 'error');
const failureBody = computed(() => describeFailedState(shows.value));
const loadedShows = computed(() => (shows.value.status === 'success' ? shows.value.data : []));
const hasResults = computed(() => loadedShows.value.length > 0);
const isEmpty = computed(() => dataState.value === 'empty');
const heading = computed(() => (query.value === '' ? 'Search' : `“${query.value}”`));
const countText = computed(() => describeShowCount(loadedShows.value.length));
const emptyHeading = computed(() => {
  const scope = genre.value === null ? '' : ` in ${genre.value}`;

  return `No shows match “${query.value}”${scope}.`;
});
</script>

<template>
  <section class="page" :data-testid="TEST_IDS.searchPage" :data-state="dataState">
    <div class="strip">
      <h1 class="heading heading-display">{{ heading }}</h1>
      <p class="count" aria-live="polite" :data-testid="TEST_IDS.searchCount">
        <span v-if="isSearching">Searching</span>
        <span v-else-if="hasResults">{{ countText }}</span>
      </p>
    </div>

    <EmptyState
      v-if="isIdle"
      heading="Search for a show."
      body="Type a title above; results appear as you type."
    />

    <ul v-else-if="isSearching" class="skeleton" aria-busy="true">
      <li v-for="card in SKELETON_CARDS" :key="card">
        <SkeletonCard />
      </li>
    </ul>

    <ErrorPanel
      v-else-if="hasFailed"
      title="Search didn't finish."
      :body="failureBody"
      @retry="retry"
    />

    <ShowGrid v-else-if="hasResults" :shows="loadedShows" />

    <EmptyState
      v-else-if="isEmpty"
      body="Try a shorter title or a different spelling, or browse the genres instead."
      :heading="emptyHeading"
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

.heading {
  overflow-wrap: anywhere;
}

.count {
  --count-baseline-offset: 0.45em;

  min-height: var(--text-meta);
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
