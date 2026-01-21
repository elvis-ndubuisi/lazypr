# SPEC: lazypr GitHub Action

This document defines the **current** technical specification for the `lazypr` GitHub Action: inputs/outputs, runtime behavior, and constraints.

## Action behavior

### Trigger

- Intended for `pull_request` events (e.g. `opened`, `synchronize`).

### High-level flow

1. Read inputs from `action.yml`
2. Fetch PR diff via GitHub compare API (`baseSha...headSha`)
3. Parse and sanitize diff (lockfiles + non-code assets excluded)
4. Truncate diff to fit provider context limits
5. Build an LLM prompt using either:
   - a custom template from the repository, or
   - a built-in preset template
6. Generate PR summary via selected provider
7. Calculate impact score + risk level and apply risk labels
8. Detect potential ghost commits by analyzing per-commit diffs vs commit message keywords
9. Update PR description with a `lazypr` section (idempotent, replace-in-place)

## Inputs (action.yml)

All inputs live in `action.yml` at the repository root.

- **`api_key`** (required): API key for the selected provider.
- **`provider`** (optional): `openai` | `anthropic` | `gemini` (default: `openai`).
- **`model`** (optional): provider model name (default: provider-specific).
- **`template`** (optional): built-in prompt preset name (default: `default`).
- **`custom_template`** (optional): `true` | `false` (default: `true`).
- **`custom_template_path`** (optional): explicit path in repo to a custom template file.
- **`github_token`** (required): token for GitHub API calls.

## Outputs (action.yml)

- **`summary`**: Generated markdown summary (also inserted into PR description).
- **`has_ghost_commits`**: `true` if any ghost commits were detected.
- **`risk_level`**: `LOW` | `MEDIUM` | `HIGH`.
- **`impact_score`**: number from 0–100.

## Templates

### Built-in templates

- Live in `packages/config-presets/src/index.ts`.
- Must include `{{diff}}` and `{{filesChanged}}`.
- Must only use placeholders supported by the summarizer:
  - `{{prTitle}}`, `{{prBody}}`, `{{prAuthor}}`
  - `{{diff}}`, `{{filesChanged}}`
  - `{{riskLevel}}`, `{{riskScore}}`, `{{highRiskFiles}}`, `{{fileBreakdown}}`

### Custom templates

- Loaded if `custom_template` is enabled and a template file exists.
- Search order:
  1. `custom_template_path` (if provided)
  2. `.github/lazypr-template.md`
  3. `.lazypr/template.md`
  4. `lazypr-template.md`
- A valid template **must** include:
  - `{{diff}}`
  - `{{filesChanged}}`

## Ghost commit detection

### Definition

A “ghost commit” is a commit where the **commit message keywords** do not appear in the **actual per-commit diff**.

### Scope limits

- Analyze at most the most recent **20 commits** in a PR to control runtime and API usage.

### Heuristic

- Extract keywords from commit message (ignore stop-words and generic change words).
- Determine mismatch when the keyword match ratio is below a threshold (default: `0.3`).

## Build & Marketplace constraints

- Action runtime: **Node 20** on GitHub runners.
- Marketplace expects repository root to contain:
  - `action.yml`
  - `dist/index.js` (bundled entrypoint)

See `docs/DEVELOPMENT.md` for the bundling workflow.
