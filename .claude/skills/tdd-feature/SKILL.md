---
name: tdd-feature
description: Red-Green-Refactor cycle for any new logic in this Vue 3 / TypeScript project (domain functions, composables, services, stores). Use when building or changing business logic; delegates RED to test-writer and the final pass to verifier.
---

# TDD feature

TDD only works when the architecture makes logic testable, so first push logic down.

## 0. Push logic down

| Layer          | Holds                                         | Test strategy                               |
| -------------- | --------------------------------------------- | ------------------------------------------- |
| `domain/`      | pure functions; no Vue, Pinia or HTTP imports | test-first, no mocks ever                   |
| `composables/` | stateful logic, side effects, timers          | test-first; fake timers, MSW                |
| `stores/`      | state read by more than one route             | test-first with `createTestingPinia`        |
| `services/`    | HTTP client, Zod schemas, mappers             | test-first against MSW and real fixtures    |
| `components/`  | rendering; props, emits, slots                | test-after: behaviour and accessible output |
| `pages/`       | orchestration only                            | renders each `AsyncState`                   |

Anything that _can_ be a pure function goes in `domain/`. What remains stateful goes in a composable or a store. The component only renders.

## 1. RED: delegate to `test-writer`

Give it the target path and the contract: signature, inputs, edge cases. It writes the spec at the mirrored path, runs it, confirms every new test fails for the right reason, and reports the implied contract. Do not write the spec inline.

## 2. GREEN: minimal implementation

Write the least code that satisfies the contract. No optimisation, no cleanup. Run only that spec: `npx vitest run tests/unit/<path>.spec.ts`.

## 3. REFACTOR: with the safety net

Names, duplication, magic values into constants, `readonly` collections, `assertNever` on every union switch. Re-run the spec after each change. Keep the source file under ~200 lines.

## 4. INTEGRATE

Wire it into the page or store. Delegate the full pass to `verifier` (type-check, lint, all tests, build). Check the running app at 390 px and 1440 px, keyboard only.

## Checklist

- [ ] Logic lives in `domain/` or a composable; the component stays dumb
- [ ] Tests confirmed RED before implementation, GREEN after, still GREEN after refactor
- [ ] No `any`, no mocked domain functions, no real timers or network
- [ ] `verifier` reports PASS; `PROGRESS.md` updated
