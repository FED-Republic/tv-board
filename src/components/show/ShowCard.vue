<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import RatingMark from '@/components/show/RatingMark.vue';
import SaveToggle from '@/components/show/SaveToggle.vue';
import ShowPoster from '@/components/show/ShowPoster.vue';
import type { Show } from '@/domain/show';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  show: Show;
  eager?: boolean;
};

const { show, eager = false } = defineProps<Props>();

const YEAR_LENGTH = 4;

const target = computed(() => ({ name: 'show', params: { id: show.id } }));
const year = computed(() => show.premiered?.slice(0, YEAR_LENGTH) ?? null);
// The link is named by its content, so the visible text is always part of the name (WCAG 2.5.3).
// Hidden lead-ins make it read "Breaking Bad, rated 9.2, 2008"; each starts with a comma and sits
// next to its own text, because name computation trims every element and drops the whitespace
// between them.
const ratingLeadIn = computed(() => (show.rating === null ? ',' : ', rated'));
</script>

<template>
  <article class="card" :data-testid="TEST_IDS.showCard" :data-show-id="show.id">
    <RouterLink class="link" :to="target" :data-testid="TEST_IDS.showCardLink">
      <ShowPoster :poster="show.poster" :name="show.name" :rating="show.rating" :eager decorative />
      <span class="meta">
        <span class="title">{{ show.name }}</span>
        <span class="details">
          <RatingMark :rating="show.rating" :lead-in="ratingLeadIn" />
          <span v-if="year" class="year">
            <span class="visually-hidden">,</span>
            {{ year }}
          </span>
        </span>
      </span>
    </RouterLink>
    <!-- Siblings of the link, never inside it: a button in a link is neither. -->
    <div class="actions">
      <SaveToggle
        kind="bookmarks"
        :show-id="show.id"
        :show-name="show.name"
        :data-testid="TEST_IDS.showCardBookmark"
      />
      <SaveToggle
        kind="likes"
        :show-id="show.id"
        :show-name="show.name"
        :data-testid="TEST_IDS.showCardLike"
      />
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  width: 100%;
  container-type: inline-size;
}

.link {
  display: flex;
  flex-direction: column;
  gap: var(--size-2);
  width: 100%;
  border-radius: var(--radius-sm);
  text-decoration: none;

  &:focus-visible {
    outline-offset: var(--focus-ring-offset-card);
  }
}

.meta {
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
  min-width: 0;
}

.title {
  overflow: hidden;
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-snug);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.details {
  display: flex;
  gap: var(--size-3);
  align-items: baseline;
  font-size: var(--text-meta);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-snug);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.actions {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  display: flex;
}

/* Two 44 px targets side by side would cover most of a phone-width poster; stacked they cover a third. */
/* A container query cannot read a custom property, so the width is literal here. */
@container (max-width: 10rem) {
  .actions {
    flex-direction: column;
  }
}

@media (hover: hover) and (pointer: fine) {
  .link:hover :deep(.poster) {
    filter: brightness(1.12);
  }
}
</style>
