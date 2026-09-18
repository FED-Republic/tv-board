<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue';
import MoreShows from '@/components/show/MoreShows.vue';
import ShowGrid from '@/components/show/ShowGrid.vue';
import IconButton from '@/components/ui/IconButton.vue';
import { useRevealOnMount } from '@/composables/useRevealOnMount';
import { type Genre, GRID_PAGE_SIZE } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { describeRowCount } from '@/domain/show-count';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  genre: Genre;
  shows: readonly Show[];
  isLoadingMore?: boolean;
  hasMorePages?: boolean;
  reveal?: boolean;
};

type Emits = {
  close: [];
  loadMore: [];
};

const {
  genre,
  shows,
  isLoadingMore = false,
  hasMorePages = false,
  reveal = false,
} = defineProps<Props>();
const emit = defineEmits<Emits>();

const headingId = useId();
const section = useTemplateRef<HTMLElement>('section');
const heading = useTemplateRef<HTMLElement>('heading');
const shownCount = ref(GRID_PAGE_SIZE);

useRevealOnMount(section, heading, () => reveal);

const shownShows = computed(() => shows.slice(0, shownCount.value));
const canShowMore = computed(() => shows.length > shownCount.value);
const closeLabel = computed(() => `Close ${genre} grid`);
const countText = computed(() => describeRowCount(shownShows.value.length, shows.length));

function onClose(): void {
  emit('close');
}

/**
 * One press, one page more on screen: the grid always grows by a page, and asks TVmaze for one
 * when it is already showing every loaded show, so the shows that land render as they arrive.
 */
function onMore(): void {
  const rendersLoadedShows = canShowMore.value;

  // One page of headroom and no more: a press the store drops must not stack up pages that a
  // later one then dumps on screen at once.
  shownCount.value = Math.min(shownCount.value + GRID_PAGE_SIZE, shows.length + GRID_PAGE_SIZE);

  if (rendersLoadedShows) {
    return;
  }

  emit('loadMore');
}
</script>

<template>
  <section
    ref="section"
    class="genre-grid"
    :aria-labelledby="headingId"
    :data-testid="TEST_IDS.genreGrid"
    :data-genre="genre"
  >
    <div class="strip">
      <h2
        :id="headingId"
        ref="heading"
        class="heading heading-display"
        tabindex="-1"
        :data-testid="TEST_IDS.genreGridHeading"
      >
        {{ genre }}
      </h2>
      <!-- Anything that widens the genre changes this line, so it is where a press is answered. -->
      <p class="count" role="status" :data-testid="TEST_IDS.genreGridCount">{{ countText }}</p>
      <IconButton
        icon="close"
        :label="closeLabel"
        :data-testid="TEST_IDS.genreGridClose"
        @click="onClose"
      />
    </div>
    <ShowGrid class="grid" :shows="shownShows" eager />
    <div class="more">
      <MoreShows
        :genre
        :can-show-more="canShowMore"
        :has-more-pages="hasMorePages"
        :is-loading-more="isLoadingMore"
        @more="onMore"
      />
    </div>
  </section>
</template>

<style scoped>
.genre-grid {
  /* Five 13rem cards and four gaps: the container width without its two gutters. */
  --grid-max-w: calc(var(--container-w) - 2 * var(--page-gutter));
  --grid-wide-columns: 5;

  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  padding-block: var(--size-6);
  padding-inline: var(--page-gutter);
  scroll-margin-block-start: var(--header-scroll-margin);
  container-type: inline-size;
}

.strip {
  display: flex;
  gap: var(--size-4);
  align-items: flex-end;
}

.heading {
  text-wrap: balance;
}

.count {
  --count-baseline-offset: 0.45em;

  flex: 1;
  padding-block-end: var(--count-baseline-offset);
  font-size: var(--text-meta);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  color: var(--color-text-muted);
}

.more {
  display: flex;
  justify-content: center;
  max-width: var(--grid-max-w);
  padding-block-start: var(--size-4);
}

/* Once five cards can share the width, the grid is exactly five wide, never four or six. */
@container (min-width: 56rem) {
  .grid {
    --grid-columns: var(--grid-wide-columns);
    --grid-track-min: 0;
  }
}
</style>
