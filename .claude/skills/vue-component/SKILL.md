---
name: vue-component
description: Use when creating or refactoring a Vue 3 single-file component. Enforces script setup, typed props/emits/slots, token-only scoped styles, container queries, test hooks, accessibility and a mirrored spec.
---

# Vue component

Read the _Components_, _Styling_, _Accessibility_ and _Readability_ sections of `docs/conventions.md`; they win over this skill. Load the `readable-code` skill for layout.

## Skeleton

Layout follows the `readable-code` skill: a named `Props` type with one member per line, script
sections in order with a blank line between them, elements on one line while they fit.

```vue
<script setup lang="ts" generic="T">
import { computed, useId, useTemplateRef } from 'vue';
import { TEST_IDS } from '@/testing/test-ids';

type Props = {
  items: readonly T[];
  label: string;
};

const { items, label } = defineProps<Props>();
const emit = defineEmits<{ select: [item: T] }>();
defineSlots<{ item(props: { item: T }): unknown }>();

const headingId = useId();
const scroller = useTemplateRef<HTMLElement>('scroller');

const isEmpty = computed(() => items.length === 0);

function onSelect(item: T): void {
  emit('select', item);
}
</script>

<template>
  <section :aria-labelledby="headingId" :data-testid="TEST_IDS.dashboardPage">
    <h2 :id="headingId">{{ label }}</h2>

    <p v-if="isEmpty">Nothing to show.</p>

    <ul v-else ref="scroller" class="row">
      <li v-for="item in items" :key="String(item)" @click="onSelect(item)">
        <slot name="item" :item />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.row {
  --row-gap: var(--size-3);

  display: flex;
  gap: var(--row-gap);
}
</style>
```

## Script

- `<script setup lang="ts">` only. Props typed by a named `Props` type (one member per line), destructured with defaults; collections `readonly`.
- Typed `defineEmits`, `defineSlots`, `defineModel`. Generic components via `generic="T"`.
- `useId()` for ids, `useTemplateRef()` for refs, `onWatcherCleanup()` inside watchers.
- No HTTP, no store mutation, no DTO types. `components/ui/` sees no domain types at all.
- `inheritAttrs: false` plus explicit `v-bind="$attrs"` when the root is not the interactive element.

## Template

- The root carries `data-testid` from `TEST_IDS` (add the key there first; the skeleton borrows an existing one). Async roots carry `data-state` from `toDataState(state)`.
- Posters: `<img>` with the `medium` source only, `aspect-ratio: 210 / 295`, `loading="lazy"` except in the first row (`fetchpriority="high"`).
- Semantic elements: `<section aria-labelledby>`, `<ul>/<li>` for lists, `<a>` to navigate, `<button>` to act.
- Every control has an accessible name; images have a meaningful `alt` or `aria-hidden`.
- `v-html` only in the single designated sanitising component.

## Style

- `scoped`. Semantic and component tokens only: no hex, `rgb()`, `hsl()` or bare `px`. Use `--size-*`, `--color-*`, `--radius-*`, `--duration-*` from `src/styles/tokens.css`.
- Component tokens declared on the root (`--card-w`) are the component's styling API; a parent overrides the token, not internal selectors.
- Data-driven values via `v-bind(expr)` in `<style>`, not an inline `style`.
- Container queries for the component's own layout (`container-type: inline-size` on a wrapper); viewport queries only in the page shell.
- Interaction by capability, `@media (hover: hover) and (pointer: fine)`, never by width.
- Interactive targets at least `--size-target`; `:focus-visible` ring from `--color-focus`; transitions use `--duration-*` so reduced motion zeroes them.

## Finish

Create the mirrored spec at `tests/unit/components/<path>/<Name>.spec.ts` in the same task (delegate to `test-writer`). Cover: null and empty props, emitted events, keyboard behaviour, `data-state` transitions.
