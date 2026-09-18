<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { RouterLink } from 'vue-router';
import GenreChip from '@/components/show/GenreChip.vue';
import RatingMark from '@/components/show/RatingMark.vue';
import SaveToggle from '@/components/show/SaveToggle.vue';
import ShowFacts from '@/components/show/ShowFacts.vue';
import ShowPoster from '@/components/show/ShowPoster.vue';
import ShowSummary from '@/components/show/ShowSummary.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import ErrorPanel from '@/components/ui/ErrorPanel.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import { useShowDetail } from '@/composables/useShowDetail';
import { toDataState } from '@/domain/async-state';
import { describeFailedState } from '@/domain/load-error';
import { isShowId } from '@/domain/show';
import { pageTitle } from '@/router/page-title';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  id: string;
};

const { id } = defineProps<Props>();

const showId = computed(() => {
  const parsed = Number(id);

  return isShowId(parsed) ? parsed : null;
});

const { show, isNotFound, retry } = useShowDetail(() => showId.value);

const dataState = computed(() => toDataState(show.value));
const isLoading = computed(() => show.value.status === 'loading');
const hasFailed = computed(() => show.value.status === 'error');
const failureBody = computed(() => describeFailedState(show.value));
const loadedShow = computed(() => (show.value.status === 'success' ? show.value.data : null));
const isRated = computed(() => loadedShow.value !== null && loadedShow.value.rating !== null);
const hasGenres = computed(() => (loadedShow.value?.genres.length ?? 0) > 0);

// The router sets a generic title; the show's own name replaces it once known.
watchEffect(() => {
  if (loadedShow.value !== null) {
    document.title = pageTitle(loadedShow.value.name);
  }
});
</script>

<template>
  <section class="page" :data-testid="TEST_IDS.showDetailPage" :data-state="dataState">
    <RouterLink class="back" :to="{ name: 'home' }" :data-testid="TEST_IDS.showDetailBack">
      <AppIcon name="chevron-left" />
      Back
    </RouterLink>

    <div v-if="isLoading" class="skeleton" aria-busy="true">
      <h1 class="visually-hidden">Loading the show</h1>
      <SkeletonCard />
    </div>

    <div v-else-if="isNotFound" class="missing">
      <h1 class="title heading-display">Show not found</h1>
      <p class="muted">{{ failureBody }}</p>
    </div>

    <div v-else-if="hasFailed">
      <h1 class="visually-hidden">Show</h1>
      <ErrorPanel title="This show didn't load." :body="failureBody" @retry="retry" />
    </div>

    <article v-else-if="loadedShow" class="detail">
      <div class="poster">
        <ShowPoster
          source="original"
          :poster="loadedShow.poster"
          :name="loadedShow.name"
          :rating="loadedShow.rating"
          eager
        />
      </div>

      <div class="body">
        <h1 class="title heading-display">{{ loadedShow.name }}</h1>

        <p class="rating">
          <RatingMark
            class="rating-mark"
            unrated-label="Not rated yet"
            :rating="loadedShow.rating"
          />
          <span v-if="isRated">average rating</span>
        </p>

        <ul v-if="hasGenres" class="chips" :data-testid="TEST_IDS.showDetailChips">
          <li v-for="genre in loadedShow.genres" :key="genre">
            <GenreChip :label="genre" />
          </li>
        </ul>

        <ShowFacts :show="loadedShow" />

        <ShowSummary :html="loadedShow.summaryHtml" />

        <div class="actions">
          <SaveToggle
            kind="bookmarks"
            :show-id="loadedShow.id"
            :show-name="loadedShow.name"
            :data-testid="TEST_IDS.showDetailBookmark"
            labelled
          />
          <SaveToggle
            kind="likes"
            :show-id="loadedShow.id"
            :show-name="loadedShow.name"
            :data-testid="TEST_IDS.showDetailLike"
            labelled
          />
          <a
            class="source"
            target="_blank"
            rel="noreferrer"
            :href="loadedShow.url"
            :data-testid="TEST_IDS.showDetailSource"
          >
            Open on TVmaze
            <span class="visually-hidden">(opens in a new tab)</span>
            <AppIcon class="source-icon" name="external" />
          </a>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--size-8);
}

.back {
  display: inline-flex;
  gap: var(--size-2);
  align-items: center;
  align-self: flex-start;
  min-height: var(--size-target);
  padding-inline: var(--size-3) var(--size-4);
  border: var(--border-w) solid var(--color-border-control);
  border-radius: var(--radius-md);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  background: var(--color-surface);
}

.skeleton {
  width: var(--detail-poster-w);
}

.detail {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-8) var(--size-12);
  align-items: flex-start;
}

.poster {
  --poster-radius: var(--radius-lg);
  --poster-shadow: var(--shadow-poster);
  --rating-bar-h: var(--rating-bar-h-lg);

  flex: 0 0 var(--detail-poster-w);
  max-width: 100%;
}

.body {
  --body-min-w: 20rem;

  display: flex;
  flex: 1 1 var(--body-min-w);
  flex-direction: column;
  gap: var(--size-6);
  min-width: 0;
}

.title {
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.muted {
  color: var(--color-text-muted);
}

.rating {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: baseline;
  font-size: var(--text-title);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
}

.rating-mark {
  --rating-mark-font: var(--font-display);
  --rating-mark-size: var(--text-rating-lg);
  --rating-mark-weight: var(--font-weight-regular);

  line-height: 1;
  letter-spacing: var(--tracking-display);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  padding-block-start: var(--size-6);
  border-block-start: var(--border-w) solid var(--color-border);
}

.source {
  display: inline-flex;
  gap: var(--size-2);
  align-items: center;
  min-height: var(--size-target);
  padding-inline: var(--size-6);
  border: var(--border-w) solid var(--color-border-control);
  border-radius: var(--radius-md);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  background: var(--color-surface);
}

.source-icon {
  --icon-size: 0.875rem;
}

@media (hover: hover) and (pointer: fine) {
  .back:hover,
  .source:hover {
    background: var(--color-surface-2);
  }
}
</style>
