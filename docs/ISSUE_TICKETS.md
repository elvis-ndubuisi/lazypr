# GitHub Issue Tickets (Copy/Paste)

This file contains issue-ready descriptions for tracking `lazypr` work in GitHub Issues.

## Epic: Marketplace-ready v1 patch (correctness + docs)

- **Goal**: Make `lazypr` publishable on GitHub Marketplace with correct behavior, clear configuration, and good documentation.
- **Acceptance criteria**:
  - `action.yml` inputs match runtime behavior
  - PR body update is idempotent and includes summary + risk + checklist + ghost commits (when detected)
  - Ghost commit detection analyzes real PR commits
  - CI + release workflows verify `dist/index.js` is up-to-date without mutating `main`
  - User + contributor documentation exists and is linked from `README.md`
- **Sub-issues**:
  - Fix inputs/templates pipeline
  - Fix PR body formatting output
  - Implement ghost commit detection end-to-end
  - Harden release/CI for marketplace
  - Add documentation

## Issue: Fix Action inputs + template pipeline mismatch

- **Problem**:
  - The action reads `custom_template` but it was missing from `action.yml`.
  - Built-in templates were not aligned with runtime prompt variables (risk of ignoring diffs).
- **Acceptance criteria**:
  - `action.yml` includes `custom_template` and `custom_template_path`
  - Built-in templates include `{{diff}}` + `{{filesChanged}}` and only supported placeholders
  - PR metadata (`prTitle`, `prBody`, `prAuthor`) is injected into prompt variables
- **Files**:
  - `action.yml`
  - `apps/github-action/src/index.ts`
  - `apps/github-action/src/template-loader.ts`
  - `packages/config-presets/src/index.ts`
  - `packages/ai-engine/src/summarizer.ts`
  - `packages/ai-engine/src/types.ts`

## Issue: Fix PR updater output formatting

- **Problem**:
  - PR updater used a placeholder PR URL and didn’t include checklist/ghost commit sections.
- **Acceptance criteria**:
  - PR URL is correct (`https://github.com/{owner}/{repo}/pull/{pullNumber}`)
  - Inserted section includes summary, risk assessment, checklist (when provided), and ghost commits section (when detected)
  - Existing lazypr section is replaced cleanly (idempotent)
- **Files**:
  - `apps/github-action/src/pr-updater.ts`

## Issue: Implement ghost commit detection end-to-end

- **Problem**:
  - Core detector had stubbed logic and the action never fetched real commits/diffs.
- **Implementation notes**:
  - Fetch commits via `octokit.pulls.listCommits`
  - For each of the most recent N commits (e.g. 20), fetch commit diff via:
    - `GET /repos/{owner}/{repo}/commits/{ref}` with `Accept: application/vnd.github.v3.diff`
  - Compare commit message keywords to the commit diff and flag mismatches
- **Acceptance criteria**:
  - Detector returns `detected=true` with a useful reason when keywords are missing
  - Action reports `has_ghost_commits` output correctly
  - PR body includes ghost commit section when detected
- **Files**:
  - `apps/github-action/src/index.ts`
  - `packages/core/src/index.ts`

## Issue: Harden build + release for Marketplace (no branch mutation)

- **Problem**:
  - Release workflow was copying artifacts and committing back to the default branch on tag push.
  - Repo `.gitignore` ignored `dist/`, which blocks committing the Marketplace bundle.
- **Acceptance criteria**:
  - `dist/index.js` is allowed to be committed (not ignored)
  - CI checks `dist/index.js` is up-to-date (rebuild + verify no diff)
  - Release workflow verifies artifacts but does not commit/push to `main`
- **Files**:
  - `.github/workflows/test.yml`
  - `.github/workflows/release.yml`
  - `.gitignore`
  - `package.json` (helper scripts)

## Issue: Add user + contributor documentation

- **Problem**:
  - README lacked accurate configuration for templates and inputs.
  - There was no structured documentation for users or contributors.
- **Acceptance criteria**:
  - Add docs:
    - `docs/USER_GUIDE.md`
    - `docs/TEMPLATES.md`
    - `docs/DEVELOPMENT.md`
    - `docs/ARCHITECTURE.md`
    - `docs/SPEC.md` reflects actual behavior
  - Update `README.md` to link docs and show correct workflow example

## Backlog: Integrate Visual Diff Map into PR output

- **Problem**:
  - `generateVisualDiffMap()` exists in `packages/ai-engine/src/checklist-generator.ts` but is not used.
- **Proposed behavior**:
  - Add an optional section to PR body: “Visual Diff Map (Top changes)” with “Before” vs “After” snippets.
  - Gate behind an input (e.g. `visual_diff_map: true/false`) to avoid noise/tokens.
- **Acceptance criteria**:
  - When enabled, PR body contains a well-formatted markdown section
  - Limits output to a small number of files/snippets

## Backlog: File-by-file analysis in PR summary

- **Problem**:
  - PDR discusses file-by-file breakdown; current output is not structured per file/module.
- **Proposed behavior**:
  - Add a “Files changed (summary)” section with per-file bullets, grouped by directory/package.
  - Cap to top N files by risk or diff size.
- **Acceptance criteria**:
  - Summary includes per-file breakdown without exceeding token/verbosity budget
  - Large PRs remain readable (grouping + caps)
