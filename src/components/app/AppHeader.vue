<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppNav from '@/components/app/AppNav.vue';
import ThemeToggle from '@/components/app/ThemeToggle.vue';
import SearchField from '@/components/search/SearchField.vue';
import GenreSelect from '@/components/show/GenreSelect.vue';
import { useGenreFilter } from '@/composables/useGenreFilter';
import { useSearchQuery } from '@/composables/useSearchQuery';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

const { draft, setQuery } = useSearchQuery();
const { genre, setGenre } = useGenreFilter();

const genreModel = computed<Genre | null>({
  get: () => genre.value,
  set: (value) => {
    void setGenre(value);
  },
});
</script>

<template>
  <header class="header" :data-testid="TEST_IDS.appHeader">
    <div class="inner">
      <div class="top">
        <RouterLink class="brand" :to="{ name: 'home' }" :data-testid="TEST_IDS.appBrand">
          TV
          <span class="brand-accent">Board</span>
        </RouterLink>
        <AppNav class="nav" />
        <ThemeToggle class="theme" />
      </div>
      <div class="tools">
        <SearchField class="search" :model-value="draft" @update:model-value="setQuery" />
        <GenreSelect v-model="genreModel" class="genre" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  inset-block-start: 0;
  z-index: 3;
  padding-block: max(var(--size-3), env(safe-area-inset-top, 0px)) var(--size-4);
  padding-inline: var(--page-gutter);
  border-block-end: var(--border-w) solid var(--color-border);
  background: var(--color-header-bg);
  backdrop-filter: blur(var(--blur-header));
  container-type: inline-size;
}

/* The container width counts its two gutters, which the header already pads; the rows' cards line up with this. */
.inner {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
  max-width: calc(var(--container-w) - 2 * var(--page-gutter));
  margin-inline: auto;
}

.top {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2) var(--size-4);
  align-items: center;
}

.brand {
  display: inline-flex;
  gap: var(--brand-gap);
  align-items: center;
  min-height: var(--size-target);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: var(--text-brand);
  line-height: 1;
  letter-spacing: var(--tracking-brand);
  text-decoration: none;

  &:focus-visible {
    outline-offset: var(--focus-ring-offset-card);
  }
}

.brand-accent {
  color: var(--color-accent);
}

.nav {
  margin-inline-start: auto;
}

.tools {
  --genre-w: 13.75rem;
  --genre-min-w: 8rem;
  --search-min-w: 10rem;

  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.search {
  flex: 1 1 var(--search-min-w);
}

.genre {
  flex: 0 1 var(--genre-w);
  min-width: var(--genre-min-w);
}

/* A container query cannot read a custom property, so the wrap width is a literal here. */
@container (max-width: 32.5rem) {
  .nav {
    order: 3;
    flex-basis: 100%;
    margin-inline-start: 0;
  }

  .theme {
    margin-inline-start: auto;
  }
}
</style>
