---
description: Commit current changes on a branch, open a PR against main, review it with the reviewer agent and the code-review skill, merge it (resolving conflicts), then switch back to main.
argument-hint: [optional commit message / PR title]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm run:*), Agent, Skill
---

# Merge to main

Take the current working-tree changes all the way to `main`: commit → branch → PR → review → merge → back on `main`. Work autonomously; stop only if a merge conflict needs a human decision, a review still has blockers or confirmed bugs after one fix round, or there is nothing to commit.

If `$ARGUMENTS` is provided, use it as the commit subject and PR title. Otherwise derive a **Conventional Commits** subject (`feat:`, `fix:`, `chore:`, `docs:`, …) from the actual diff.

## Steps

1. **Inspect.** `git status`, `git branch --show-current`, `git diff --stat`. If there is nothing to commit, say so and stop.

2. **Branch.** If the current branch is `main`, create `feat/<short-slug>` (or `fix/`, `chore/`) from it and continue. Otherwise stay on the current feature branch.

3. **Quality gate.** Run `npm run validate`. Report failures instead of hiding them; stop if it is red unless the user said to proceed anyway.

4. **Commit.** `git add -A`, then commit with a Conventional Commits message: a concise subject plus a body explaining why. End the message with:

   ```
   Co-Authored-By: Claude <model> <noreply@anthropic.com>
   ```

   where `<model>` is the model running this session; do not hardcode a name here, it goes stale.

5. **Push.** `git push -u origin <branch>`. If the SSH remote is unavailable, run `gh auth setup-git` and push over HTTPS: `git push https://github.com/<owner>/<repo>.git <branch>:<branch>` (read `<owner>/<repo>` from `git remote -v`).

6. **PR.** `gh pr create --base main --head <branch> --title "<subject>" --body "<summary>"`. Write a real summary: what changed, scope notes, validation result. End the body with:

   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

7. **Review.** Two reviews run on the same PR, at the same time. Launch both, then wait for both.

   **a. Conventions** — spawn the `reviewer` agent with the Agent tool (`subagent_type: reviewer`). The prompt names the PR and the diff to read, for example:

   ```
   Review PR #<n> (branch <branch> against main). The change set is `gh pr diff <n>`
   (equivalently `git diff origin/main...<branch>`). Report blockers, should-fix, nits and missing tests.
   ```

   Post its report as a PR comment: `gh pr comment <n> --body "<report>"`.

   **b. Correctness** — invoke the `code-review` skill with the Skill tool, args `<n> high --comment`. It hunts bugs and reuse/simplification/efficiency cleanups and posts its findings as inline PR comments. Do not pass `--fix` and do not use the `ultra` level; ultra is user-triggered and billed.

   **Merge gate.** Proceed to step 8 only when the reviewer reported no blockers and `code-review` reported no confirmed correctness finding. Otherwise:
   - Fix the reviewer blockers and the confirmed correctness findings on the branch, re-run `npm run validate`, commit (`fix:` or `refactor:` with a body naming the finding), push, and run both reviews once more on the new diff. If blockers or confirmed correctness findings remain after this second pass, stop and report them; do not merge.
   - Fold in should-fix items, nits and cleanups that are one-line changes with those fixes; leave the rest as PR comments. Plausible (unconfirmed) `code-review` findings stay as comments and do not block the merge.

8. **Merge, resolving conflicts.**
   - `gh pr view <n> --json mergeable,mergeStateStatus`.
   - If mergeable: `gh pr merge <n> --merge`.
   - If conflicting: `git fetch origin main`, `git merge origin/main` on the branch, resolve keeping both sides' intent, re-run `npm run validate`, commit, push, merge. If a conflict is genuinely ambiguous (two valid intents), stop and ask which to keep. Do not guess on semantically conflicting logic.

9. **Back to main.** `git checkout main && git pull --ff-only origin main`. Confirm with `git branch --show-current` and `git log --oneline -3`.

## Report

Branch name, commit hash, PR URL and merge status, the outcome of both reviews (blockers and confirmed findings fixed, or none), whether conflicts were resolved, and confirmation you are on `main` at the merged commit. Leave the feature branch in place unless asked to delete it.
