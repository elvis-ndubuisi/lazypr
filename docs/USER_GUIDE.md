# User Guide

`lazypr` is a GitHub Action that generates a PR summary from your PR diff, adds a risk label, and updates the PR body with an idempotent “lazypr” section.

## Basic setup

Create `.github/workflows/lazypr.yml`:

```yaml
name: lazypr
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: elvis-ndubuisi/lazypr@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          api_key: ${{ secrets.OPENAI_API_KEY }}
          provider: openai
          # optional:
          # model: gpt-4o-mini
          template: default
```

## Inputs

All inputs are defined in `action.yml`:

- `api_key` (required): provider API key.
- `provider` (optional): `openai` | `anthropic` | `gemini` (default: `openai`).
- `model` (optional): provider model name. If empty, a provider default is used.
- `template` (optional): built-in prompt preset (default: `default`).
- `custom_template` (optional): `true`/`false` (default: `true`).
- `custom_template_path` (optional): explicit repo path to a custom template.
- `github_token` (required): GitHub token (normally `${{ secrets.GITHUB_TOKEN }}`).

## Outputs

- `summary`: generated markdown summary.
- `has_ghost_commits`: whether ghost commits were detected.
- `risk_level`: `LOW` | `MEDIUM` | `HIGH`.
- `impact_score`: 0–100.

## Using a custom template

1. Add a file in your repo, for example `.github/lazypr-template.md`.
2. Ensure the file includes at least:
   - `{{diff}}`
   - `{{filesChanged}}`
3. Enable custom templates:

```yaml
      - uses: elvis-ndubuisi/lazypr@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
          custom_template: true
          custom_template_path: ".github/lazypr-template.md"
```

## Permissions and limitations

- The action needs write access to:
  - update PR body (`pull-requests: write`)
  - add/remove labels (`issues: write`)
- For PRs from forks, `GITHUB_TOKEN` permissions may be restricted by GitHub; the action may not be able to update the PR body or labels.
