<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import { EAGER_POSTER_COUNT } from '@/components/show/eager-posters';
import ShowCard from '@/components/show/ShowCard.vue';
import IconButton from '@/components/ui/IconButton.vue';
import ScrollRow from '@/components/ui/ScrollRow.vue';
import { useRevealInPlace } from '@/composables/useRevealInPlace';
import type { GenreRow } from '@/domain/genre';
import type { Show, ShowId } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  row: GenreRow;
  progress: number;
  filling?: boolean;
  eager?: boolean;
  reveal?: boolean;
};

const { row, progress, filling = false, eager = false, reveal = false } = defineProps<Props>();
const emit = defineEmits<{ expand: [] }>();

const PERCENT = 100;

const headingId = useId();
const section = useTemplateRef<HTMLElement>('section');
const heading = useTemplateRef<HTMLElement>('heading');

useRevealInPlace(section, heading, () => reveal);

const progressWidth = computed(() => `${Math.round(progress * PERCENT)}%`);
const expandLabel = computed(() => `Show the ${row.genre} row as a grid`);

const keyOf = (show: Show): ShowId => show.id;
const isEagerAt = (index: number): boolean => eager && index < EAGER_POSTER_COUNT;

function onExpand(): void {
  emit('expand');
}
</script>

<template>
  <section
    ref="section"
    class="genre-row"
    :aria-labelledby="headingId"
    :data-testid="TEST_IDS.genreRow"
    :data-genre="row.genre"
  >
    <ScrollRow :items="row.shows" :item-key="keyOf" :label="row.genre" :filling>
      <template #heading>
        <h2
          :id="headingId"
          ref="heading"
          class="heading heading-display"
          tabindex="-1"
          :data-testid="TEST_IDS.genreRowHeading"
        >
          {{ row.genre }}
        </h2>
      </template>
      <template #tools>
        <IconButton
          icon="grid"
          :label="expandLabel"
          :data-testid="TEST_IDS.genreRowExpand"
          @click="onExpand"
        />
      </template>
      <template #status>
        <div class="progress" aria-hidden="true" :data-testid="TEST_IDS.genreRowProgress">
          <div class="progress-value" :class="{ done: !filling }" />
        </div>
      </template>
      <template #item="{ item, index }">
        <ShowCard :show="item" :eager="isEagerAt(index)" />
      </template>
    </ScrollRow>
  </section>
</template>

<style scoped>
.genre-row {
  --genre-row-intrinsic-h: 24rem;

  padding-block: var(--size-6);
  content-visibility: auto;
  contain-intrinsic-size: auto var(--genre-row-intrinsic-h);
  scroll-margin-block-start: var(--header-scroll-margin);
}

.heading {
  text-wrap: balance;
}

/* Reads as "how much of the index has landed"; goes quiet once loading ends. */
.progress {
  height: var(--hairline-w);
  margin-inline: var(--page-gutter);
  border-radius: var(--radius-pill);
  background: var(--color-border);
  overflow: hidden;
}

.progress-value {
  width: v-bind(progressWidth);
  height: 100%;
  background: var(--color-accent);
  transition:
    width var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out);

  &.done {
    background: var(--color-border);
  }
}
</style>
