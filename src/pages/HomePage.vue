<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted } from 'vue';
import GenreGrid from '@/components/show/GenreGrid.vue';
import GenreRow from '@/components/show/GenreRow.vue';
import GenreRowSkeleton from '@/components/show/GenreRowSkeleton.vue';
import MoreShows from '@/components/show/MoreShows.vue';
import DeferredBlock from '@/components/ui/DeferredBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorPanel from '@/components/ui/ErrorPanel.vue';
import { useGenreGrid } from '@/composables/useGenreGrid';
import { toDataState } from '@/domain/async-state';
import { describeEmptyDashboard, describeIndexStatus } from '@/domain/dashboard-copy';
import { type Genre, placeholderGenres } from '@/domain/genre';
import { describeFailedState } from '@/domain/load-error';
import { useShowsStore } from '@/stores/shows';
import { TEST_IDS } from '@/testing/test-ids';

/** Rows rendered on first paint; the rest mount as the reader scrolls near them. */
const EAGER_ROW_COUNT = 6;

const shows = useShowsStore();
const {
  indexState,
  byGenre,
  knownGenres,
  pagesLoaded,
  isIndexComplete,
  isLoadingMore,
  hasMorePages,
  indexProgress,
} = storeToRefs(shows);
const {
  genre,
  revealedRow,
  gridGenre,
  gridShows,
  isGridMode,
  isRevealedGrid,
  expand,
  close,
  askForPage,
  askFromEmpty,
} = useGenreGrid();

const dataState = computed(() => toDataState(indexState.value));
const isLoading = computed(() => indexState.value.status === 'loading');
const hasFailed = computed(() => indexState.value.status === 'error');
const failureBody = computed(() => describeFailedState(indexState.value));
const isLoaded = computed(() => indexState.value.status === 'success');
const placeholders = computed(() => placeholderGenres(knownGenres.value, genre.value));
const hasRows = computed(() => byGenre.value.length > 0);
const isEmpty = computed(() => (isGridMode.value ? gridGenre.value === null : !hasRows.value));
const statusText = computed(() =>
  describeIndexStatus({
    status: indexState.value.status,
    isLoadingMore: isLoadingMore.value,
    rowCount: byGenre.value.length,
  }),
);
const emptyCopy = computed(() => describeEmptyDashboard(genre.value));

const isRevealed = (rowGenre: Genre): boolean => rowGenre === revealedRow.value;
// Behind an open grid the rows are hidden, so none of them is worth a poster request yet.
const isEagerRow = (index: number, rowGenre: Genre): boolean =>
  !isGridMode.value && (index < EAGER_ROW_COUNT || isRevealed(rowGenre));
const isFirstRow = (index: number): boolean => index === 0;
const placeholderKey = (placeholder: Genre | null, index: number): string =>
  placeholder ?? `anonymous-${index}`;

onMounted(() => {
  void shows.loadIndex();
});

onUnmounted(() => {
  shows.abort();
});
</script>

<template>
  <section
    class="dashboard"
    :data-testid="TEST_IDS.dashboardPage"
    :data-state="dataState"
    :data-index-pages-loaded="pagesLoaded"
    :data-index-complete="isIndexComplete"
  >
    <h1 class="visually-hidden">All Genres</h1>
    <p class="visually-hidden" role="status" :data-testid="TEST_IDS.dashboardStatus">
      {{ statusText }}
    </p>

    <div
      v-if="isLoading"
      class="skeleton"
      aria-busy="true"
      :data-testid="TEST_IDS.dashboardSkeleton"
    >
      <GenreRowSkeleton
        v-for="(placeholder, index) in placeholders"
        :key="placeholderKey(placeholder, index)"
        :genre="placeholder"
      />
    </div>

    <div v-else-if="hasFailed" class="panel">
      <ErrorPanel title="The show index didn't load." :body="failureBody" @retry="shows.retry" />
    </div>

    <template v-else-if="isLoaded">
      <GenreGrid
        v-if="gridGenre !== null"
        :key="gridGenre"
        :genre="gridGenre"
        :shows="gridShows"
        :is-loading-more="isLoadingMore"
        :has-more-pages="hasMorePages"
        :reveal="isRevealedGrid"
        @close="close"
        @load-more="askForPage"
      />
      <!-- The rows stay mounted behind the grid: closing it finds the page as tall, and as far
           along its deferred rows, as the reader left it. -->
      <div v-show="!isGridMode" :data-testid="TEST_IDS.dashboardRows">
        <DeferredBlock
          v-for="(row, index) in byGenre"
          :key="row.genre"
          :eager="isEagerRow(index, row.genre)"
        >
          <template #placeholder>
            <GenreRowSkeleton :genre="row.genre" deferred />
          </template>
          <GenreRow
            :row
            :progress="indexProgress"
            :filling="isLoadingMore"
            :eager="isFirstRow(index)"
            :reveal="isRevealed(row.genre)"
            @expand="expand(row.genre)"
          />
        </DeferredBlock>
      </div>
      <div v-if="isEmpty" class="panel">
        <EmptyState :heading="emptyCopy.heading" :body="emptyCopy.body">
          <!-- An empty genre grid is where another page is worth most, so it offers one. -->
          <template v-if="genre !== null" #action>
            <MoreShows
              :genre
              :has-more-pages="hasMorePages"
              :is-loading-more="isLoadingMore"
              @more="askFromEmpty"
            />
          </template>
        </EmptyState>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Rows bleed to the page edge so the next card peeks; the strip and scroller pad themselves. */
.dashboard {
  display: flex;
  flex-direction: column;
  margin-inline: calc(-1 * var(--page-gutter));
  padding-block: var(--size-4) var(--size-16);
}

.panel {
  padding-inline: var(--page-gutter);
}

.skeleton {
  display: flex;
  flex-direction: column;
  animation: pulse var(--duration-pulse) ease-in-out infinite;
}
</style>
