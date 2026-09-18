---
name: readable-code
description: Use when writing, refactoring or reviewing any TypeScript, Vue single-file component, CSS or spec file. Defines the vertical, one-idea-per-line layout that Prettier and ESLint cannot decide alone - script setup section order, one element per line, logic out of templates, guard clauses, small named functions, Arrange/Act/Assert in tests - and names the rules the tools do enforce.
---

# Readable code

Code is read top to bottom, once, by someone who did not write it. Every rule below has one target:
the reader never scans sideways and never holds two ideas from one line.

The tools own the mechanical part. Prettier (`.prettierrc`) keeps an element on one line while it
fits in 100 columns and prints one attribute per line when it does not, breaks before operators
and expands every block. ESLint (`eslint.config.js`, block `app/readability`)
fixes block order, macro order, padding between blocks, braces on every `if`, nesting depth and
parameter count. Run `npx prettier --write <file>` and `npx eslint --fix <file>` before judging
layout by eye. This skill covers what a formatter cannot decide.

## One idea per line

- One statement per line and one declaration per `const`.
- A blank line separates groups of related lines; no blank line inside a group; never two in a row.
- A ternary is allowed only when both branches are a single value and the whole expression fits on
  one line. Otherwise use `if` / `else` or a lookup object. Nested ternaries are a lint error.
- A condition with more than two operands gets a name: `const canRetry = …;` then `if (canRetry)`.
- A chain of more than two calls breaks one call per line, and the chain has a name.

## Names

- A name says what the value means in the domain, not its shape: `unratedShows`, not `filteredArr`.
- Booleans read as questions: `isLoading`, `hasPoster`, `canScrollNext`.
- Functions start with a verb: `groupByGenre`, `toShowId`, `loadNextPage`. Event handlers start
  with `on`: `onSelect`, `onScrollNext`.
- Full words. The only abbreviations are `id`, `url`, `dto`, `html`, `css`, and `-w` on a width
  token (`--card-w`, `--border-w`). Single letters only for
  generics and index loops.
- A number with a unit carries it: `timeoutMs`, `maxAgeHours`, `cardWidthRem`.
- A magic value becomes a module-level `UPPER_SNAKE` constant: `const MAX_RETRIES = 3;`.

## Functions

- `function name()` for anything with a body block; an arrow only for a single expression or an
  inline callback.
- Every exported function has an explicit return type.
- Guard clauses first, each an early `return`; the happy path ends the function unindented.
- Nesting stops at three levels and a function takes at most three parameters (lint). More
  parameters become one options object with a named type.
- One level of abstraction per function: it either orchestrates named steps or does one step.
- A function that no longer fits on one screen (about 30 lines) is split at the names it already
  contains.

```ts
// Before: the reader tracks three nested conditions to find the result.
export function toDataState(state: AsyncState<unknown>): AsyncStatus | 'empty' {
  if (state.status === 'success') {
    if (Array.isArray(state.data)) {
      if (state.data.length === 0) {
        return 'empty';
      }
    }
  }
  return state.status;
}

// After: one named question, one guard, one result.
export function toDataState(state: AsyncState<unknown>): AsyncStatus | 'empty' {
  const isEmptyList =
    state.status === 'success' && Array.isArray(state.data) && state.data.length === 0;

  if (isEmptyList) {
    return 'empty';
  }

  return state.status;
}
```

## `<script setup>` order

Sections in this order, one blank line between sections, no section comments:

1. Imports: Vue and libraries, then `@/` modules, then relative paths.
2. Types: `Props` declared as a named `type`, one member per line, never inline in the macro.
   `Emits` and `Slots` get the same treatment once they have more than one member.
3. Macros: `defineOptions`, `defineModel`, `defineProps<Props>()` (destructured), `defineEmits`
   (as `emit`), `defineSlots` (lint fixes the order).
4. Composables and stores: `useRoute()`, `storeToRefs(useShowsStore())`.
5. Local state: `ref`, `useTemplateRef`, `useId`.
6. Derived state: `computed`.
7. Functions: event handlers, then helpers.
8. Effects: `watch`, `watchEffect`, lifecycle hooks.
9. `defineExpose`, always last.

A `<script setup>` longer than about 60 lines moves logic into a composable and keeps only wiring.

```ts
// Before: the contract hides inside the macro call.
const { items, label } = defineProps<{ items: readonly T[]; label: string }>();

// After: the contract is a named type the reader scans one member at a time.
type Props = {
  items: readonly T[];
  label: string;
};

const { items, label } = defineProps<Props>();
```

## Template

- Attribute order is fixed by lint (`vue/attributes-order` in `eslint.config.js`): `v-if` /
  `v-for`, then `id` / `ref` / `key`, `v-model`, static attributes, bound attributes, boolean
  shorthands, events, `v-html`.
- An element stays on one line while it fits in 100 columns. When it does not, Prettier prints
  one attribute per line, the closing `>` on its own line and the content on its own line. Never
  break attributes by hand: Prettier joins them again.
- A child element that has attributes or children of its own goes on its own line under its
  parent.
- A template expression is one property access, one call or one comparison. Anything longer
  becomes a `computed` or a function in the script.
- Branching content uses `v-if` / `v-else` on elements or `<template v-if>` around siblings, never
  a ternary that returns markup or a long string.
- Static classes stay in `class`; dynamic ones go in `:class="{ active: isActive }"` (lint).
- Prettier ignores inline whitespace, so a sentence that mixes text and inline elements must keep
  its punctuation inside the element (`<a>TVmaze.</a>`) or move to a computed string.

```vue
<!-- Short elements stay on one line, even with three attributes; a child with attributes gets its own. -->
<li v-for="item in items" :key="String(item)">
  <slot name="item" :item />
</li>
<img :src="poster.small" :alt="name" loading="lazy" />

<!-- A long element breaks one attribute per line; the reader scans the list, then the content. -->
<button
  type="button"
  class="arrow arrow-next"
  :aria-label="`Scroll ${label} forward`"
  :disabled="!canScrollNext"
  @click="onScrollNext"
>
  ›
</button>
```

## `<style scoped>`

- One rule set per concept, a blank line between rule sets, selectors in template order.
- Component tokens (`--card-w`) are declared first in the root rule set.
- Declarations grouped in order: layout, box, typography, colour, motion.
- Nesting one level at most (`&:hover`); container and media queries at the end of the block.

## Tests

- One behaviour per `it`; the title is the Given/When/Then sentence and the body has no loops or
  conditions.
- When a phase needs more than one line, one blank line separates Arrange, Act and Assert.
- Fixtures and builders are named for what they represent: `showWithoutRating()`, never `mock1`.

## Comments

- A comment says why, or names a constraint the code cannot show. Never what the code already
  shows.
- One-sentence `/** */` on an exported symbol whose contract has a rule the signature does not
  carry (`AsyncState` says unrated shows sort last; the type cannot).
- No commented-out code and no `TODO`; open work goes in `PROGRESS.md`.

## Checklist

- [ ] Prettier and ESLint have run on the file; no `eslint-disable`
- [ ] `Props` is a named type with one member per line
- [ ] Script sections in order with a blank line between them
- [ ] No template expression beyond one access, call or comparison
- [ ] Every function: guard clauses first, happy path last, explicit return type when exported
- [ ] Every name is a domain word; booleans are questions; numbers carry units; magic values named
- [ ] Tests: one behaviour each, phases separated by a blank line
