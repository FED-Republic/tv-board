<script setup lang="ts">
import { computed } from 'vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  genre: Genre | null;
  deferred?: boolean;
};

const { genre, deferred = false } = defineProps<Props>();

const SKELETON_CARDS = [0, 1, 2, 3, 4, 5, 6] as const;

const isAnonymous = computed(() => genre === null);
// A deferred row exists and mounts when reached, so its heading stays in the accessibility
// tree for heading navigation; a loading placeholder stands for nothing yet and hides.
const isHidden = computed(() => (deferred ? undefined : 'true'));
</script>

<template>
  <div
    class="skeleton-row"
    :aria-hidden="isHidden"
    :data-testid="TEST_IDS.genreRowSkeleton"
    :data-genre="genre"
  >
    <h2
      v-if="deferred"
      class="heading heading-display"
      :class="{ anonymous: isAnonymous }"
      :data-testid="TEST_IDS.genreRowSkeletonHeading"
    >
      {{ genre }}
    </h2>
    <div
      v-else
      class="heading heading-display"
      :class="{ anonymous: isAnonymous }"
      :data-testid="TEST_IDS.genreRowSkeletonHeading"
    >
      {{ genre }}
    </div>
    <div class="cards" aria-hidden="true">
      <SkeletonCard v-for="card in SKELETON_CARDS" :key="card" class="card" />
    </div>
  </div>
</template>

<style scoped>
/* Spacing and type follow GenreRow and its scroller, so the swap to real rows barely moves. */
.skeleton-row {
  --skeleton-heading-w: clamp(10rem, 30cqw, 18.75rem);
  --skeleton-row-intrinsic-h: 24rem;
  --row-edge-pad: var(--size-2);

  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  padding-block: var(--size-6);
  padding-inline: var(--page-gutter);
  container-type: inline-size;
  content-visibility: auto;
  contain-intrinsic-size: auto var(--skeleton-row-intrinsic-h);
}

.heading {
  color: var(--color-text-muted);

  &.anonymous {
    width: var(--skeleton-heading-w);
    height: 1lh;
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }
}

.cards {
  display: flex;
  gap: var(--row-gap);
  padding-block: var(--row-edge-pad);
  overflow: hidden;
}

.card {
  flex: none;
  width: var(--card-w);
}
</style>
