---
name: lazypr-refactor-planning
description: Creates refactor plans and refactor spec docs for the lazypr Bun monorepo, with a checklist-first workflow and repo-specific constraints. Use when working in this repository and planning refactors, architecture changes, or multi-package updates (apps/github-action, packages/core, packages/ai-engine).
---

# LazyPR Refactor Planning

## Quick start

When a task involves refactoring (especially across multiple packages), do this before coding:

1. Identify scope and constraints:
   - Read `docs/PDR.md` for architectural constraints and package boundaries.
   - Skim `docs/REFACTOR_SPECS.md` for the existing “refactor spec” style and requirements language.
   - Re-check `AGENTS.md` for repo workflows (Bun commands, build/test/lint).
2. Create a refactor spec document:
   - Prefer a new file under `docs/refactor-specs/<slug>.md` (use the scaffold script below).
   - If the user explicitly wants edits in-place, update `docs/REFACTOR_SPECS.md` instead.
3. Produce a checklist-first plan (see below), then implement incrementally with checkpoints.

## Refactor planning checklist (use this format)

- [ ] **Goal**: What outcome must be true when done? (1–3 sentences)
- [ ] **Non-goals**: What is explicitly not being changed?
- [ ] **Affected packages**: Which of `apps/github-action`, `packages/core`, `packages/ai-engine`, `packages/config-presets` are touched?
- [ ] **Interfaces & contracts**: What inputs/outputs/public exports change? (include any env vars)
- [ ] **Constraints**:
  - [ ] Use **Bun** commands (`bun install`, `bun run build`, `bun run test`, `bun run lint`)
  - [ ] `apps/github-action` must bundle to a single Node-targeted `dist/index.js`
  - [ ] Strict TypeScript, no `any`, prefer functional/pure functions
- [ ] **Step-by-step plan**: Small, reversible steps with “verify” points between them
- [ ] **Risk & rollback**: Biggest risks, and how to revert safely
- [ ] **Test plan**: Exact commands + any manual validation
- [ ] **Done criteria**: Concrete checks that prove the refactor is complete

## Refactor spec template

Use this structure (matches the repo’s existing refactor/spec vibe):

```markdown
# Refactor: <title>

## 🚨 Current issues
- ...

## 🎯 Requirements
- ...

## 🧭 Proposed approach
- ...

## 🔁 Step-by-step plan
1. ...

## ⚠️ Risks & mitigations
- ...

## ✅ Test plan
- `bun run build`
- `bun run test`
- `bun run lint`
- (package-specific commands as needed)

## 🚀 Rollout / migration notes
- ...

## ✅ Done criteria
- ...

## ❓ Open questions
- ...
```

## Helper script (scaffold a new spec)

Create a new refactor spec file quickly:

```bash
bun ".cursor/skills/lazypr-refactor-planning/scripts/scaffold-refactor-spec.ts" --title "Multi-provider AI & diff optimization"
```

## Repo-specific reminders

- If changes touch `packages/core`, consider the impact on `apps/github-action` (GitHub Action runtime and PR metadata usage).
- If changes touch `packages/ai-engine`, verify how prompts are constructed and validated (typed payloads; avoid leaking raw errors).
