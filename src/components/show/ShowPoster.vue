<script setup lang="ts">
import { computed } from 'vue';
import { ratingBarFraction } from '@/domain/rating';
import { type Poster, type PosterSource, posterSrc } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  poster: Poster | null;
  name: string;
  rating: number | null;
  source?: PosterSource;
  eager?: boolean;
  /** Inside a card the visible title already names the show, so the image adds nothing. */
  decorative?: boolean;
};

const {
  poster,
  name,
  rating,
  source = 'medium',
  eager = false,
  decorative = false,
} = defineProps<Props>();

const PERCENT = 100;
/** Intrinsic sizes, so the box is right before the image lands; TVmaze `original` is 2:3. */
const IMAGE_SIZES = {
  medium: { width: 210, height: 295 },
  original: { width: 1000, height: 1500 },
} as const;

const src = computed(() => posterSrc(poster, source));
const alt = computed(() => (decorative ? '' : `${name} poster`));
const fallbackHidden = computed(() => (decorative ? 'true' : undefined));
const size = computed(() => IMAGE_SIZES[source]);
const loading = computed(() => (eager ? 'eager' : 'lazy'));
const fetchPriority = computed(() => (eager ? 'high' : 'auto'));
const isRated = computed(() => rating !== null);
const barWidth = computed(() => `${ratingBarFraction(rating) * PERCENT}%`);
</script>

<template>
  <div class="poster" :data-testid="TEST_IDS.showPoster" :data-source="source">
    <img
      v-if="src"
      class="image"
      decoding="async"
      draggable="false"
      :src
      :alt
      :width="size.width"
      :height="size.height"
      :loading
      :fetchpriority="fetchPriority"
      :data-testid="TEST_IDS.showPosterImage"
    />
    <div
      v-else
      class="fallback"
      :aria-hidden="fallbackHidden"
      :data-testid="TEST_IDS.showPosterFallback"
    >
      No poster yet
    </div>
    <span v-if="isRated" class="bar" aria-hidden="true" :data-testid="TEST_IDS.ratingBar" />
  </div>
</template>

<style scoped>
.poster {
  --poster-radius: var(--radius-sm);
  --poster-shadow: none;

  position: relative;
  width: 100%;
  aspect-ratio: var(--poster-ratio);
  border-radius: var(--poster-radius);
  overflow: hidden;
  background: var(--color-surface);
  box-shadow: var(--poster-shadow);

  /* The original image is 2:3, the medium one 210:295; the box follows the image it shows. */
  &[data-source='original'] {
    aspect-ratio: var(--poster-ratio-original);
  }
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: var(--size-3);
  border: var(--border-w) dashed var(--color-border);
  border-radius: var(--poster-radius);
  font-size: var(--text-meta);
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
  text-align: center;
  color: var(--color-text-muted);
}

/* The one bold element: bar length reads as rating across a whole row. */
.bar {
  position: absolute;
  inset-inline-start: 0;
  inset-block-end: 0;
  width: v-bind(barWidth);
  height: var(--rating-bar-h);
  background: var(--color-rating);
}
</style>
