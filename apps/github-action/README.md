# lazypr AI PR Summary

![Tests](https://github.com/elvis-ndubuisi/lazypr/actions/workflows/test.yml/badge.svg)
![Release](https://github.com/elvis-ndubuisi/lazypr/actions/workflows/release.yml/badge.svg)
![Node](https://img.shields.io/node/v20)

Automatically generate AI-powered PR summaries with impact scoring, Ghost Commit detection, and automated reviewer checklists.

## Features

- **AI-Powered Summaries**: Uses OpenAI, Anthropic, or Google Gemini to generate meaningful PR descriptions
- **Multi-Provider Support**: Choose your LLM provider (openai, anthropic, gemini)
- **Impact Scoring**: Automatically assesses risk based on changed files (auth, schema, etc.)
- **Ghost Commit Detection**: Identifies commits where the message doesn't match the changes
- **Reviewer Checklists**: Generates context-aware checklist items based on the code changes
- **Risk Labels**: Adds `lazypr/high-risk`, `lazypr/medium-risk`, or `lazypr/low-risk` labels
- **Custom Templates**: Supports loading custom prompt templates from your repository
- **PR Title Enhancement**: Auto-renames vague titles like "fixes" to descriptive alternatives
- **Ticket Detection**: Extracts and links JIRA, GitHub issues from PRs
- **PR Size Detection**: Warns on oversized PRs, optionally blocks massive ones
- **1M Token Context**: Gemini 2.5 Flash handles large PRs effortlessly

## Usage

### Basic Setup

Add this to your workflow file (e.g., `.github/workflows/pr-summary.yml`):

```yaml
name: AI PR Summary
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
```

### With All Options

```yaml
name: AI PR Summary
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
        with:
          fetch-depth: 0

      - uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
          model: gemini-2.5-flash
          template: default
          custom_template: true
          auto_update_title: true
          vagueness_threshold: 40
          pr_size_warning: 500
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | Yes | - | OpenAI, Anthropic, or Google Gemini API key |
| `provider` | No | `openai` | LLM provider (`openai`, `anthropic`, or `gemini`) |
| `model` | No | (auto) | Model to use. Auto-selected based on provider |
| `template` | No | `default` | Template name (`default`, `concise`, `verbose`, `security-focused`) |
| `custom_template` | No | `true` | Whether to load custom template from repo |
| `custom_template_path` | No | - | Explicit path to custom template file |
| `ticket_pattern` | No | - | Custom regex for ticket detection (e.g., `[A-Z]+-\\d+`) |
| `ticket_url_template` | No | - | URL template for ticket links (use `{{id}}`) |
| `auto_update_title` | No | `false` | Automatically rename vague PR titles |
| `vagueness_threshold` | No | `40` | Vagueness score (0-100) that triggers title update. Lower = more aggressive |
| `custom_placeholders` | No | `{}` | JSON object of custom template placeholders |
| `pr_size_warning` | No | `500` | Warn if PR exceeds this many lines (0 to disable) |
| `pr_size_block` | No | `2000` | Block if PR exceeds this many lines (0 to disable) |
| `github_token` | Yes | `${{ github.token }}` | GitHub token for API access |

## Outputs

| Output | Description |
|--------|-------------|
| `summary` | Generated PR summary |
| `has_ghost_commits` | Whether ghost commits were detected |
| `risk_level` | Risk level (`LOW`, `MEDIUM`, `HIGH`) |
| `impact_score` | Impact score (0-100) |
| `enhanced_title` | Improved PR title if original was vague, empty if no change |
| `related_tickets` | Markdown-formatted list of detected tickets |
| `pr_size_lines` | Total lines changed in the PR |
| `pr_size_warning_triggered` | Whether PR size warning was triggered |
| `pr_size_blocked` | Whether summarization was blocked due to size |

## PR Title Enhancement

Enable `auto_update_title` to automatically improve vague PR titles:

```yaml
- uses: elvis-ndubuisi/lazypr@v1
  with:
    api_key: ${{ secrets.GEMINI_API_KEY }}
    auto_update_title: true
    vagueness_threshold: 40  # Aggressive (catches "fixes", "updates", etc.)
```

### Threshold Guide

| Threshold | Behavior |
|-----------|----------|
| `40` (default) | Aggressive - catches "fixes", "updates", "wip", "hotfix" |
| `60` | Moderate - very generic titles only |
| `70` | Lenient - only extremely vague titles |

### Example Transformations

| Before | After |
|--------|-------|
| `fixes` | `Fix authentication token validation in auth service` |
| `updates` | `Update user profile component with avatar support` |
| `wip` | `Update checkout flow with payment integration` |

## Templates

### Built-in Templates

1. **default**: Standard PR summary with risk assessment and checklist
2. **concise**: Brief summary only, minimal output
3. **verbose**: Detailed analysis with file breakdown
4. **security-focused**: Emphasizes security implications

### Custom Templates

Enable custom templates by setting `custom_template: true`. The action will look for:

- `.github/lazypr-template.md`
- `.lazypr/template.md`
- `lazypr-template.md`

Template placeholders:
- `{{diff}}` - The git diff
- `{{filesChanged}}` - List of changed files
- `{{prTitle}}` - PR title
- `{{prBody}}` - PR body/description
- `{{prAuthor}}` - PR author username
- `{{riskLevel}}` - Risk level (LOW/MEDIUM/HIGH)
- `{{riskScore}}` - Impact score (0-100)
- `{{highRiskFiles}}` - List of high-risk files
- `{{fileBreakdown}}` - Summary of file risk breakdown
- `{{relatedTickets}}` - Detected ticket links

## Risk Assessment

Files are categorized as:

- **HIGH RISK**: auth, schema, migrations, permissions, secrets, API keys
- **MEDIUM RISK**: controllers, services, routes, API endpoints
- **LOW RISK**: tests, configs, documentation

## Example Output

```markdown
## 🚀 PR Summary: Add user authentication

This PR implements JWT-based authentication for the API...

### Risk Assessment: 🟡 MEDIUM (Score: 65/100)

### Reviewer Checklist
- [ ] Test authentication flow end-to-end
- [ ] Verify authorization checks
- [ ] Update API documentation

---
*Generated by lazypr at 2024-01-16T12:00:00Z*
```

## Environment Variables

Add your API key as a secret:

1. Go to your repository Settings > Secrets and variables > Actions
2. Add one of:
   - `GEMINI_API_KEY` (for Gemini)
   - `OPENAI_API_KEY` (for OpenAI)
   - `ANTHROPIC_API_KEY` (for Anthropic)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.
