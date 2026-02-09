# lazypr AI Context Document

## What is lazypr?

**lazypr** is an AI-powered GitHub Action that automatically generates intelligent Pull Request summaries. It uses Large Language Models (LLMs) to transform git diffs into human-readable, context-aware summaries that help reviewers understand what changed, why it changed, and what to pay attention to.

**Repository**: https://github.com/elvis-ndubuisi/lazypr

**Latest Release**: v1.1.1

**Marketplace**: Published and available for use

---

## Technical Architecture

### Monorepo Structure (Bun Workspace)

```
lazypr/
├── apps/
│   └── github-action/          # Entry point bundled for Node.js runtime
├── packages/
│   ├── ai-engine/              # LLM orchestration (OpenAI, Anthropic, Gemini)
│   ├── config-presets/         # Built-in template definitions
│   └── core/                   # Git logic, diff sanitization, Ghost Commit detection
├── templates/                  # Community-contributed templates (NEW)
└── .github/
    └── lazypr-template.md      # Default custom template location
```

### Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Bun 1.2+ | Package manager, bundler, and test runner |
| **Language** | TypeScript (Strict) | Type-safe code generation |
| **LLM Providers** | LangChain.js | Unified interface for OpenAI, Anthropic, Google Gemini |
| **GitHub Integration** | @actions/github | Event context, PR metadata, API access |
| **Validation** | Zod | Schema validation for LLM responses |

### Key Packages

- **`@lazypr/core`**: Parses git diffs, sanitizes content (filters lockfiles, non-code assets), detects "Ghost Commits" (commits where message ≠ changes).
- **`@lazypr/ai-engine`**: Orchestrates LLM calls, manages token limits, validates responses.
- **`@lazypr/config-presets`**: Stores built-in templates (`default`, `security`, `concise`, `verbose`).

---

## Current Features (v1.1.1)

### ✅ Core Functionality

1.  **AI-Powered Summarization**
    *   Uses LangChain.js for multi-provider support.
    *   Supports **OpenAI** (GPT-4 Turbo), **Anthropic** (Claude Sonnet 4), and **Google Gemini** (2.5 Flash).
    *   Automatic provider-specific token limits (Gemini: 800K, Anthropic: 150K, OpenAI: 100K).

2.  **Diff Sanitization**
    *   Parses raw git diffs into structured file objects.
    *   Filters out `node_modules`, `package-lock.json`, binary files, and non-code assets.
    *   Smart truncation to fit within LLM context windows.

3.  **Ghost Commit Detection**
    *   Analyzes commits in the PR to detect "Ghost Commits" (messages that don't match the actual code changes).
    *   Limits analysis to the last 20 commits to avoid rate limits.
    *   Reports potential issues to the PR author.

4.  **Risk Assessment & Labeling**
    *   Calculates an **Impact Score** (0-100) based on file types, change density, and historical patterns.
    *   Assigns **Risk Levels**: 🟢 Low, 🟡 Medium, 🟠 High, 🔴 Critical.
    *   Automatically applies GitHub labels to the PR.

5.  **Template System**
    *   **Built-in Templates**: Default, Security, Concise, Verbise.
    *   **Custom Templates**: Supports loading from `.github/lazypr-template.md`, `.lazypr/template.md`, or `lazypr-template.md`.
    *   **AI Instruction Format**: Templates use an "AI Instruction" prefix with constraints, followed by an exact output format.

6.  **Checklist Generation**
    *   Automatically generates reviewer checklists based on the AI summary.
    *   Embedded directly into the PR description.

---

## Setup & Configuration

### GitHub Action Inputs

| Input | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `api_key` | Yes | - | LLM provider API key (OpenAI, Anthropic, or Gemini) |
| `provider` | No | `openai` | LLM provider (`openai`, `anthropic`, `gemini`) |
| `model` | No | Provider-specific | Model identifier (e.g., `gpt-4-turbo`) |
| `template` | No | `default` | Built-in template name |
| `custom_template` | No | `true` | Enable/disable custom template loading |
| `custom_template_path` | No | - | Explicit path to a custom template (e.g., `templates/freelancer.md`) |
| `github_token` | No | `${{ github.token }}` | GitHub API token |

### Workflow Example

```yaml
name: lazypr PR Summary

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  summarize:
    runs-on: ubuntu-latest
    steps:
      - uses: elvis-ndubuisi/lazypr@v1
        with:
          api_key: ${{ secrets.GEMINI_API_KEY }}
          provider: gemini
          custom_template: true
          custom_template_path: templates/freelancer.md
```

---

## Known Limitations & Constraints

1.  **Template Path**: Custom templates must be in the repository and accessible via the GitHub API. External URLs are not supported.
2.  **Large Diffs**: Very large PRs (>800K tokens for Gemini) will be truncated aggressively.
3.  **No Streaming**: The action currently waits for the full LLM response before updating the PR.
4.  **Single Template**: Only one template can be used per PR; there's no conditional logic based on file types or labels.
5.  **No Rate Limiting**: The action does not implement backoff or retry logic for rate-limited LLM APIs.
6.  **No Local Models**: Only cloud LLM providers are supported; local models (Ollama, LM Studio) are not implemented.

---

## Recent Changes

| Version | Date | Highlights |
| :--- | :--- | :--- |
| **v1.1.1** | Jan 2026 | Security cleanup, marketplace prep, AI instruction format refactor |
| **v1.0.4** | Dec 2025 | API key leak fix, action.yml root relocation |
| **v1.0.0** | Nov 2025 | Initial release with Gemini support |

---

## Community Templates (NEW)

As of the latest update, a `templates/` directory has been added to the repository with **10 community-contributed templates**:

### Scenario-Specific
| Template | Audience | Focus |
| :--- | :--- | :--- |
| `freelancer.md` | Clients | Value delivered, requirements completed |
| `open-source.md` | Contributors | Community standards, issue linking |
| `organization.md` | Staff Engineers | Architecture, security, cross-team impact |
| `personal.md` | Solo Developers | Lessons learned, future TODOs |

### Generic Use Cases
| Template | Use Case |
| :--- | :--- |
| `bug-fix.md` | Before/after and root cause analysis |
| `new-feature.md` | User experience and usage examples |
| `refactor.md` | Maintainability and performance |
| `security.md` | Vulnerability mitigation |
| `documentation.md` | Doc clarity and accuracy |
| `minimalist.md` | Lightning-fast summaries |

---

## What the AI Needs to Know

When suggesting new features for lazypr, please consider the following:

### 1. **Monorepo Boundaries**
*Changes to `packages/core` may impact `apps/github-action` and vice versa.*

### 2. **Bundling Constraints**
*`apps/github-action` must be bundled with `bun build --target node` into a single `dist/index.js` file. It cannot import Node.js native modules that aren't available in the GitHub Actions runtime.*

### 3. **GitHub Actions Limits**
*The action runs in a constrained environment with limited compute. Expensive operations (e.g., downloading large models, processing multi-MB diffs) will timeout or fail.*

### 4. **Template Validation**
*Any new template must include `{{diff}}` and `{{filesChanged}}` placeholders. The action validates this before use.*

### 5. **Provider Abstraction**
*New LLM providers should follow the LangChain.js interface used in `@lazypr/ai-engine`. Avoid provider-specific logic outside the provider layer.*

### 6. **Security & Privacy**
*API keys must never be logged or exposed. Diffs are sanitized to avoid leaking secrets, but new patterns should be added cautiously.*

---

## Suggested Feature Categories

If you're brainstorming, here are high-value areas to explore:

1.  **Multi-Template Logic**: Support conditional templates based on labels, file patterns, or PR size.
2.  **Streaming Summaries**: Stream the LLM response to the PR comment as it generates (requires GitHub API support).
3.  **Local Model Support**: Add Ollama or LM Studio as a provider for offline/private deployments.
4.  **Reviewer Assignment**: Suggest reviewers based on file ownership.
5.  **JIRA/Ticket Integration**: Parse ticket IDs from commit messages and link them in the summary.
6.  **CI/CD Feedback Loop**: Parse CI test failures and include them in the summary for context.
7.  **Diff Explainer**: For complex diffs, generate a "Plain English" summary for non-technical stakeholders.
8.  **Custom Placeholders**: Allow users to define their own placeholders (e.g., `{{jiraTickets}}`, `{{qaNotes}}`).

---

**Document Version**: 1.0

**Last Updated**: 2026-02-03

**Maintainer**: elvis-ndubuisi