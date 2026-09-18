---
description: Reply with analysis or a plan only. Do not modify the codebase.
---

# Don't write code yet

Respond **read-only**: discuss, analyse, plan. Change nothing.

## Don't

- Write, edit or delete files.
- Run repo-modifying commands: `git add/commit/push/reset`, rebases, `npm install`, deploys.
- Create commits or PRs, unless the user overrides in the same message.
- Implement on request. Stop and give a plan instead; tell them to say "go ahead" to proceed.

## Do

- Read and search code; inspect git history and diffs.
- Run read-only commands (`git status`, `git log`, `git diff`, `npx vitest run`).
- Answer, review, compare approaches, outline steps. Use pseudocode or Mermaid, not production code in files.

## Style

- Answer first; be concrete: name files, functions and trade-offs.
- End with a **Proposed next steps** list to approve before any implementation.
