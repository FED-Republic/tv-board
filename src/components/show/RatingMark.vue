<script setup lang="ts">
import { computed } from 'vue';
import { formatRating } from '@/domain/rating';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  rating: number | null;
  unratedLabel?: string;
  /** Spoken before the mark, never shown: ", rated" turns "9.2" into ", rated 9.2" in a name. */
  leadIn?: string;
};

const { rating, unratedLabel = 'Not rated', leadIn = '' } = defineProps<Props>();

const isRated = computed(() => rating !== null);
const hasLeadIn = computed(() => leadIn !== '');
const label = computed(() => (rating === null ? unratedLabel : formatRating(rating)));
</script>

<template>
  <span class="mark" :class="{ rated: isRated }" :data-testid="TEST_IDS.ratingMark">
    <span v-if="hasLeadIn" class="visually-hidden">{{ leadIn }}</span>
    {{ label }}
  </span>
</template>

<style scoped>
/* The parent sets `--rating-mark-size` and `--rating-mark-font` for the detail page. */
.mark {
  --rating-mark-size: inherit;
  --rating-mark-font: inherit;
  --rating-mark-weight: var(--font-weight-bold);

  font-family: var(--rating-mark-font);
  font-size: var(--rating-mark-size);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.rated {
  font-weight: var(--rating-mark-weight);
  color: var(--color-rating);
}
</style>
