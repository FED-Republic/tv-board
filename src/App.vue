<script setup lang="ts">
import { nextTick, onWatcherCleanup, useTemplateRef, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppHeader from '@/components/app/AppHeader.vue';
import { isTypingTarget } from '@/lib/typing-target';
import { TEST_IDS } from '@/testing/test-ids';

const route = useRoute();

const main = useTemplateRef<HTMLElement>('main');

// Keyboard and screen-reader users land on the new page instead of staying on the link they
// activated. The tick waits for the new view to render; the cleanup flag drops a focus move
// that a faster second navigation has already superseded. Typing in the search field also
// navigates, and the reader keeps typing.
function focusMainAfterRender(): void {
  let isSuperseded = false;

  onWatcherCleanup(() => {
    isSuperseded = true;
  });

  void nextTick().then(() => {
    if (isSuperseded || isTypingTarget(document.activeElement)) {
      return;
    }

    main.value?.focus();
  });
}

watch(() => route.path, focusMainAfterRender);
</script>

<template>
  <a class="skip-link" href="#main" :data-testid="TEST_IDS.skipLink">Skip to content</a>
  <AppHeader />
  <main id="main" ref="main" class="main" tabindex="-1">
    <RouterView />
  </main>
  <footer class="footer" :data-testid="TEST_IDS.appFooter">
    <p>
      Data from
      <a href="https://www.tvmaze.com" rel="noreferrer" target="_blank">
        TVmaze,
        <span class="visually-hidden">(opens in a new tab)</span>
      </a>
      CC BY-SA 4.0.
    </p>
  </footer>
</template>

<style scoped>
.skip-link {
  position: absolute;
  inset-block-start: var(--size-2);
  inset-inline-start: var(--size-2);
  z-index: 4;
  padding: var(--size-2) var(--size-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  transform: translateY(-200%);

  &:focus-visible {
    transform: none;
  }
}

.main {
  flex: 1 0 auto;
  width: 100%;
  max-width: var(--container-w);
  margin-inline: auto;
  padding-block: var(--size-6);
  padding-inline: var(--page-gutter);

  /* Focus lands here after every navigation; a quiet ring says so without shouting. */
  &:focus-visible {
    outline-color: var(--color-border);
    outline-offset: calc(-1 * var(--focus-ring-w));
  }
}

.footer {
  width: 100%;
  max-width: var(--container-w);
  margin-inline: auto;
  padding-block: var(--size-8) max(var(--size-8), env(safe-area-inset-bottom, 0px));
  padding-inline: var(--page-gutter);
  font-size: var(--text-meta);
  color: var(--color-text-muted);
}
</style>
