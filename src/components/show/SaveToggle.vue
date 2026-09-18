<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import type { IconName } from '@/components/ui/icon-paths';
import type { SavedKind } from '@/domain/saved';
import type { ShowId } from '@/domain/show';
import { useSavedStore } from '@/stores/saved';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  kind: SavedKind;
  showId: ShowId;
  showName: string;
  labelled?: boolean;
};

const { kind, showId, showName, labelled = false } = defineProps<Props>();

const saved = useSavedStore();

// The name never changes with the state: `aria-pressed` announces it, so a switching label
// would announce it twice (WAI-ARIA APG, toggle buttons).
const COPY: Readonly<Record<SavedKind, { verb: string; icon: IconName }>> = {
  bookmarks: { verb: 'Bookmark', icon: 'bookmark' },
  likes: { verb: 'Like', icon: 'heart' },
};

const copy = computed(() => COPY[kind]);
const isActive = computed(() => saved.idsOf(kind).has(showId));
const iconLabel = computed(() => (labelled ? undefined : `${copy.value.verb} ${showName}`));

function onToggle(): void {
  saved.toggle(kind, showId);
}
</script>

<template>
  <button
    class="toggle"
    type="button"
    :class="{ labelled, active: isActive }"
    :aria-pressed="isActive"
    :aria-label="iconLabel"
    :data-testid="TEST_IDS.saveToggle"
    :data-kind="kind"
    @click="onToggle"
  >
    <span class="scrim">
      <AppIcon :name="copy.icon" :filled="isActive" />
    </span>
    <span v-if="labelled">{{ copy.verb }}</span>
  </button>
</template>

<style scoped>
/* Icon mode floats over a poster: a scrim keeps the outline legible on any image. */
.toggle {
  --toggle-icon-size: 0.9375rem;

  display: grid;
  place-items: center;
  width: var(--size-target);
  height: var(--size-target);
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-on-poster);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out);

  &:focus-visible {
    outline-offset: var(--focus-ring-offset-inset);
  }
}

.scrim {
  --icon-size: var(--toggle-icon-size);

  display: grid;
  place-items: center;
  width: var(--toggle-scrim-size);
  height: var(--toggle-scrim-size);
  border-radius: var(--radius-pill);
  background: var(--color-scrim);
  backdrop-filter: blur(var(--blur-scrim));
}

.active {
  color: var(--color-accent-on-poster);
}

/* Labelled mode is a secondary button on the detail page. */
.labelled {
  --toggle-icon-size: var(--size-icon-sm);

  display: inline-flex;
  gap: var(--size-2);
  align-items: center;
  width: auto;
  min-height: var(--size-target);
  padding-inline: var(--size-6);
  border: var(--border-w) solid var(--color-border-control);
  background: var(--color-surface);
  font-size: var(--text-title);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  color: var(--color-text);

  &.active {
    color: var(--color-accent-text);
  }

  &:focus-visible {
    outline-offset: var(--focus-ring-offset);
  }

  .scrim {
    width: auto;
    height: auto;
    background: transparent;
    backdrop-filter: none;
  }
}

@media (hover: hover) and (pointer: fine) {
  .toggle:hover {
    color: var(--color-accent-on-poster);
  }

  .labelled:hover {
    background: var(--color-surface-2);
  }
}
</style>
