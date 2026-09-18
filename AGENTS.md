# TV Board

Vue 3.5 + TypeScript + Vite SPA: TV shows grouped by genre, sorted by rating, with search, a
detail page and bookmarked and liked shows saved in `localStorage`, on the public TVmaze API.
Portfolio piece: every change is judged on clarity, type safety, tests and accessibility, not on
speed.

## Start every task

1. Read `PROGRESS.md` (the current item) and `docs/conventions.md` (the rules). A convention wins
   over a habit; if code and a convention disagree, fix one of them in the same change.
2. Say in two lines which sections of `docs/conventions.md` apply. Plan the smallest change and
   list the files to touch with their mirrored spec files.
3. Finish with `npm run validate` green (delegate to `verifier`), then one line in `PROGRESS.md`.
   Record a new dependency, folder or pattern in `DECISIONS.md` before introducing it.

## Commands

`npm run dev` · `npm run validate` (type-check + lint + format check + unit tests + build) · `npm run test:watch`

## Non-negotiables

- No `any`, `@ts-ignore`, non-null `!`, or `as` casts (except `as const` and after a type guard).
  No `enum`.
- Layers point inward: pages → components → composables → stores → domain ← services. A DTO never
  leaves `services/`; a component never fetches.
- Loading and error state is `AsyncState<T>` from `domain/async-state.ts`, never separate booleans.
  Async roots mirror it to `data-state`.
- Every component: `<script setup lang="ts">`, typed props and emits, scoped styles with tokens
  only, `data-testid` from `TEST_IDS`, a spec at the mirrored path under `tests/unit/`.
- Tests: Vitest, TypeScript, Given/When/Then titles, HTTP mocked with MSW only, no real timers.
- Layout per `.claude/rules/readable-code.md`: one idea per line, script sections in order, logic
  out of templates, guard clauses first. Prettier and ESLint run before layout is judged by eye.
- Conventional Commits. Never commit or push unless asked (`/review-and-merge` counts as asking).

## Delegation (standing authorization)

Spawn these with the Agent tool without asking, including proactively:

- **test-writer**: writes failing tests first (TDD RED) for `domain/`, `composables/`, `services/`
  and `stores/`, and repairs broken tests. Do not write spec files inline.
- **verifier**: runs the full pass (type-check, lint, all tests, build). Do not run the full suite
  inline; a single `npx vitest run <spec>` while iterating is fine.
- **reviewer**: reviews the diff against `docs/conventions.md` before a commit or when a review is
  asked for.

test-writer and verifier are independent; launch both in one message when a task needs both. Relay
each report to the user; do not re-run what an agent already ran.

## Skills

`readable-code` before writing or reviewing any source, style or spec file · `tdd-feature` for any
new logic · `vue-component` for a new or refactored SFC · `api-boundary` for endpoints, schemas and
mappers · `vue-docs` before using an unfamiliar Vue, Router, Pinia, Vite, Vitest, MSW or Zod API.

Rules in `.claude/rules/` (`readable-code`, `be-concise`) load into every session; the skills hold
the full versions. Hooks in `.claude/hooks/` (local, gitignored) format on write, block risky edits
and commands, and refuse to stop while type-check or lint is red.
