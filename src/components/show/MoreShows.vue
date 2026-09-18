<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { describeMoreShows, LOADED_WHOLE_INDEX_TEXT } from '@/domain/dashboard-copy';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  genre: Genre;
  canShowMore?: boolean;
  hasMorePages?: boolean;
  isLoadingMore?: boolean;
};

const {
  genre,
  canShowMore = false,
  hasMorePages = false,
  isLoadingMore = false,
} = defineProps<Props>();
const emit = defineEmits<{ more: [] }>();

const endNote = useTemplateRef<HTMLElement>('endNote');
const hasAskedForPage = ref(false);

const hasMore = computed(() => canShowMore || hasMorePages);
const copy = computed(() => describeMoreShows(canShowMore, genre));
// Only the page a reader asked for is a wait; the background loop fills the index unasked.
const isAwaitingPage = computed(() => hasAskedForPage.value && isLoadingMore);

async function onMore(): Promise<void> {
  const asksForPage = !canShowMore;

  emit('more');

  if (!asksForPage) {
    return;
  }

  await nextTick();
  // The store takes a press by starting a page; one it had no page for is nobody's wait.
  hasAskedForPage.value = isLoadingMore;
}

/**
 * A press that spends the last page takes its own button off the screen, and focus with it. The
 * note that replaces it is where the reader lands instead, so the answer is one they can read.
 */
watch(
  () => isLoadingMore,
  async (isLoading) => {
    if (isLoading || !hasAskedForPage.value) {
      return;
    }

    hasAskedForPage.value = false;
    // The note exists only once the swap has rendered.
    await nextTick();
    catchDroppedFocus();
  },
);

/** Only focus the reader lost with the button is the grid's to move; the rest is theirs. */
function catchDroppedFocus(): void {
  if (document.activeElement !== document.body) {
    return;
  }

  endNote.value?.focus();
}
</script>

<template>
  <div class="more-shows" :data-testid="TEST_IDS.moreShows">
    <AppButton
      v-if="hasMore"
      class="more-button"
      variant="primary"
      :aria-busy="isAwaitingPage"
      :data-testid="TEST_IDS.moreShowsButton"
      @click="onMore"
    >
      {{ copy.text }}
      <span class="visually-hidden">{{ copy.hint }}</span>
    </AppButton>
    <p v-else ref="endNote" class="end" tabindex="-1" :data-testid="TEST_IDS.moreShowsEnd">
      {{ LOADED_WHOLE_INDEX_TEXT }}
    </p>
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

.end {
  font-size: var(--text-meta);
  color: var(--color-text-muted);
}
</style>
