<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import {
  describeLoadedPage,
  describeMoreShows,
  LOADED_WHOLE_INDEX_TEXT,
  type PageReport,
} from '@/domain/dashboard-copy';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  genre: Genre;
  canShowMore?: boolean;
  hasMorePages?: boolean;
  isAwaitingPage?: boolean;
  pageReport?: PageReport | null;
};

const {
  genre,
  canShowMore = false,
  hasMorePages = false,
  isAwaitingPage = false,
  pageReport = null,
} = defineProps<Props>();
const emit = defineEmits<{ more: [] }>();

const endNote = useTemplateRef<HTMLElement>('endNote');

const hasMore = computed(() => canShowMore || hasMorePages);
const copy = computed(() => describeMoreShows(canShowMore, genre));
const reportText = computed(() => describeLoadedPage(pageReport, genre, hasMorePages));
// Only the press that asks TVmaze waits; rendering shows the app already holds needs no network.
const isWaitingForPage = computed(() => isAwaitingPage && !canShowMore);

/** A press during the wait is the double request the wait exists to prevent, so it is dropped. */
function onMore(): void {
  if (isWaitingForPage.value) {
    return;
  }

  emit('more');
}

/** Only focus the reader lost with the button is the grid's to move; the rest is theirs. */
function catchDroppedFocus(): void {
  if (document.activeElement !== document.body) {
    return;
  }

  endNote.value?.focus();
}

/**
 * A press that spends the last page takes its own button off the screen, and focus with it. The
 * note that replaces it is where the reader lands instead, so the answer is one they can read.
 */
watch(isWaitingForPage, async (isWaiting) => {
  if (isWaiting) {
    return;
  }

  // The note exists only once the swap has rendered.
  await nextTick();
  catchDroppedFocus();
});
</script>

<template>
  <div class="more-shows" :data-testid="TEST_IDS.moreShows">
    <AppButton
      v-if="hasMore"
      class="more-button"
      variant="primary"
      :aria-busy="isWaitingForPage"
      :aria-disabled="isWaitingForPage"
      :data-testid="TEST_IDS.moreShowsButton"
      @click="onMore"
    >
      {{ copy.text }}
      <span class="visually-hidden">{{ copy.hint }}</span>
    </AppButton>
    <p v-else ref="endNote" class="end" tabindex="-1" :data-testid="TEST_IDS.moreShowsEnd">
      {{ LOADED_WHOLE_INDEX_TEXT }}
    </p>
    <!-- Always in the tree, so the answer to a press is announced when it lands. -->
    <p class="report" role="status" :data-testid="TEST_IDS.moreShowsReport">{{ reportText }}</p>
  </div>
</template>

<style scoped>
.more-shows {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.more-button {
  /* The one call to action under a grid: wide enough to find without becoming a banner. */
  --more-button-max-w: 20rem;

  width: 100%;
  max-width: var(--more-button-max-w);
  min-height: var(--size-12);
  font-size: var(--text-prose);
}

.end,
.report {
  font-size: var(--text-meta);
  color: var(--color-text-muted);
  text-align: center;
}

/* Never `display: none`: a live region that leaves the tree is not announced when it returns. */
.report:not(:empty) {
  margin-block-start: var(--size-3);
}
</style>
