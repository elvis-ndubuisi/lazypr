# PDR: lazypr - AI PR Summarizer

## 🎯 Vision

A Bun-powered monorepo that automates GitHub PR descriptions using LLMs with a "Bring Your Own Key" (BYOK) model.

## 🏗️ Architecture (Bun Monorepo)

- **apps/github-action**: The entry point. Must be bundled for Node.js (target: node) to run on GitHub Runners.
- **packages/core**: Git logic. Responsible for fetching diffs and "Ghost Commit" detection (diff vs log mismatch).
- **packages/ai-engine**: LLM abstraction. Handles prompt construction and multi-provider (OpenAI/Anthropic) support.
- **packages/config-presets**: Pre-defined prompt templates (e.g., security-focused, concise, verbose).

## 🛠️ Tech Stack

- **Runtime/Manager**: Bun (v1.2+)
- **Monorepo Tool**: Turborepo (turbo.json)
- **CI/CD**: GitHub Actions (Target Runtime: Node 20)

## 🚦 Execution Phases

1. **Phase 1: Foundation**: Setup `turbo.json`, root `package.json`, and inter-workspace linking.
2. **Phase 2: Core Logic**: Implement Git diff fetching using `@octokit/rest` in `packages/core`.
3. **Phase 3: AI Orchestration**: Setup LangChain/LiteLLM in `packages/ai-engine`.
4. **Phase 4: The Action**: Create the wrapper in `apps/github-action` and bundling logic via `bun build`.

## ⚠️ Constraints

- Always use TypeScript.
- No `any` types; use Zod for API response validation.
- `apps/github-action` must output a single `dist/index.js` file.
