<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { TEST_IDS } from '@/testing/test-ids';
</script>

<template>
  <nav class="nav" aria-label="Main" :data-testid="TEST_IDS.appNav">
    <RouterLink class="link" :to="{ name: 'home' }" :data-testid="TEST_IDS.navAllGenres">
      All Genres
    </RouterLink>
    <RouterLink class="link" :to="{ name: 'bookmarked' }" :data-testid="TEST_IDS.navBookmarked">
      Bookmarked
    </RouterLink>
    <RouterLink class="link" :to="{ name: 'liked' }" :data-testid="TEST_IDS.navLiked">
      Liked
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  --nav-gap: clamp(0.75rem, 2vw, 1.75rem);
  --nav-underline-inset: 0.375rem;

  display: flex;
  gap: var(--nav-gap);
  align-items: center;
}

.link {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: var(--size-target);
  padding-inline: var(--size-1);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  text-decoration: none;
  color: var(--color-text-muted);
  transition: color var(--duration-fast) var(--ease-out);

  &::after {
    content: '';
    position: absolute;
    inset-inline: var(--size-1);
    inset-block-end: var(--nav-underline-inset);
    height: var(--hairline-w);
    border-radius: var(--radius-pill);
    background: var(--color-accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--duration-base) var(--ease-out);
  }

  &.router-link-exact-active {
    color: var(--color-text);

    &::after {
      transform: scaleX(1);
    }
  }
}

@media (hover: hover) and (pointer: fine) {
  .link:hover {
    color: var(--color-text);
  }
}
</style>
