# Readable code

Layout rules for every source, style and spec file. The `readable-code` skill has the full
version with examples; load it before writing or reviewing code. Prettier and ESLint enforce the
mechanical part; run them before judging layout by eye.

- One idea per line: one statement, one declaration, one type member. An element stays on one
  line while it fits in 100 columns; Prettier breaks it one attribute per line when it does not.
- `Props` is a named type with one member per line, never inline in `defineProps`.
- `<script setup>` sections in order: imports, macros, composables and stores, local state,
  computed, functions, effects, `defineExpose`. One blank line between sections.
- A template expression is one property access, one call or one comparison; longer logic becomes
  a `computed` or a function.
- Guard clauses first, happy path last; nesting stops at three levels; at most three parameters.
- Names are domain words: booleans read as questions, functions start with a verb, numbers carry
  their unit, magic values become named constants.
- Comments say why, never what. No commented-out code, no `TODO`.
