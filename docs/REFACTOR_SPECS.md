# Refactor Task: Multi-Provider AI & Diff Optimization

## 🚨 Current Issues

- `ai-engine` is hardcoded to specific SDKs (`@google/generative-ai`, `openai`).
- `core` sends raw diff strings, which will fail on large PRs due to token limits.
- No abstraction layer for "Bring Your Own Key" (BYOK).

## 🎯 Requirements

### 1. Multi-Provider AI (ai-engine)

- **Library**: Install and use `@langchain/core` and `@langchain/google-genai` (and eventually `@langchain/openai`).
- **Pattern**: Implement an `LLMService` that initializes a model based on an environment variable `LLM_PROVIDER` (e.g., `google`, `openai`, `anthropic`).
- **Template**: Centralize prompts into a template system using LangChain's `PromptTemplate`.

### 2. Intelligent Diff Logic (core)

- **Library**: Install `gitdiff-parser` or `what-the-diff`.
- **Logic**:
  - Parse raw diff into a structured object.
  - **Filter**: Exclude lockfiles (`bun.lockb`, `pnpm-lock.yaml`), minified files, and assets.
  - **Priority**: If the diff exceeds 15,000 tokens, prioritize `.ts`, `.js`, and `.py` files.
  - **Truncation**: Truncate large file changes while preserving the file headers and a "..." summary.

## 📦 Dependencies to Add

- `packages/ai-engine`: `@langchain/core`, `@langchain/google-genai`, `@langchain/openai`
- `packages/core`: `gitdiff-parser`, `@types/gitdiff-parser`
