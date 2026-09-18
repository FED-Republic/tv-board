---
name: vue-docs
description: Fetch current documentation through Context7 before using an unfamiliar or version-sensitive API from Vue 3.5, Vue Router 5, Pinia 4, Vite 8, Vitest 5, MSW 2 or Zod 4. ALWAYS use when a task touches router configuration or navigation guards, Pinia setup stores, Vite or Vitest config, MSW handlers, or Zod schema APIs, even if documentation is not requested. Prefer fetched docs over training data; these libraries changed major versions recently.
---

# Library docs

Installed versions are in `package.json`. Resolve the library in Context7, query for the exact topic, and implement from the fetched docs rather than from memory.

| Library    | Context7 id          | Fallback                  |
| ---------- | -------------------- | ------------------------- |
| Vue        | `/vuejs/docs`        | https://vuejs.org/guide/  |
| Vue Router | `/vuejs/router`      | https://router.vuejs.org/ |
| Pinia      | `/vuejs/pinia`       | https://pinia.vuejs.org/  |
| Vite       | `/vitejs/vite`       | https://vite.dev/guide/   |
| Vitest     | `/vitest-dev/vitest` | https://vitest.dev/guide/ |
| MSW        | `/mswjs/msw`         | https://mswjs.io/docs/    |
| Zod        | `/colinhacks/zod`    | https://zod.dev/          |

Use `resolve-library-id` first when an id above does not resolve. If Context7 is unreachable, WebFetch the fallback page for the installed major version.
