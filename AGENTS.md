# AGENTS.md

This document provides guidelines for agents operating in the lazypr repository.

## Project Overview

lazypr is an AI-powered GitHub Action that generates PR summaries from code diffs. It's a Bun monorepo with:
- `apps/github-action`: Entry point bundled for Node.js runtime
- `packages/core`: Git logic, diff sanitization, "Ghost Commit" detection
- `packages/ai-engine`: Multi-provider LLM orchestration (OpenAI, Anthropic, local LLMs)

## Build, Lint, and Test Commands

### Package Manager
Always use **Bun** (v1.2+). Never suggest npm, pnpm, or yarn.

### Core Commands
```bash
# Install all dependencies across workspace
bun install

# Build all packages (apps/github-action outputs dist/index.js)
bun run build

# Run all tests
bun run test

# Run linter on all packages
bun run lint

# Development mode with turbo
bun run dev

# Clean build artifacts and node_modules
bun run clean
```

### Running Single Tests
```bash
# Run tests in a specific package
cd packages/core && bun run test
cd packages/ai-engine && bun run test

# Run a specific test file
bun test <file-path>

# Run tests matching a pattern
bun test --test-name-pattern "ghost commit"
```

### Building for GitHub Action
```bash
# Build apps/github-action for Node.js runtime
cd apps/github-action && bun build --target node --outfile dist/index.js src/index.ts
```

## Code Style Guidelines

### TypeScript
- Use **strict TypeScript** mode (tsconfig.json: `strict: true`)
- **No `any` types** - use explicit types or Zod for validation
- Enable `noUncheckedIndexedAccess: true` for safer array/object access
- Provide interfaces for all LLM payloads and GitHub API responses

### Imports and Exports
- Use **top-level exports** only (no default exports for functions/classes)
- Use **bare imports** for workspace packages:
  ```typescript
  import { gitDiff } from "@lazypr/core";
  import { openaiProvider } from "@lazypr/ai-engine";
  ```
- Use `bun add <package> --workspace` when adding dependencies that exist in other workspace packages

### Naming Conventions
- **Files**: kebab-case (e.g., `ghost-commit-detector.ts`)
- **Classes**: PascalCase (e.g., `DiffAnalyzer`)
- **Functions/variables**: camelCase (e.g., `sanitizeDiff`, `impactScore`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_CONTEXT_TOKENS`)
- **Interfaces**: PascalCase with `I` prefix optional (prefer descriptive names like `PRMetadata` over `IPRMetadata`)
- **Packages**: `@lazypr/<package-name>` format

### Error Handling
- Use **try/catch** with typed error variables
- Create custom error classes for domain-specific errors:
  ```typescript
  class GhostCommitError extends Error {
    constructor(
      message: string,
      public readonly commitSha: string,
      public readonly diffMismatch: string
    ) {
      super(message);
      this.name = "GhostCommitError";
    }
  }
  ```
- Never expose raw error messages to users; log internally, return user-friendly messages

### Functional Programming
- Prefer **pure functions** over classes where possible
- Use **immutable patterns** - create new objects instead of mutating
- Use **array methods** (map, filter, reduce) over for-loops
- Use ** Result/Either patterns** for fallible operations

### GitHub Action Integration
- Use `@actions/github` context for PR metadata access
- Respect GitHub Actions runtime limits
- Output must be Markdown-compatible for PR descriptions
- Filter out `node_modules`, `package-lock.json`, and binary files before sending to LLM

### API Design (packages/ai-engine)
- Support multiple providers via a unified interface:
  ```typescript
  interface LLMProvider {
    complete(prompt: string, options?: CompletionOptions): Promise<Completion>;
    stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
  }
  ```
- Use Zod for provider response validation
- Support BYOK (Bring Your Own Key) via environment variables

### Git Context Awareness
- When modifying `packages/core`, consider impact on `apps/github-action`
- When modifying `packages/ai-engine`, consider how prompts are constructed in `packages/core`
- Cross-package changes should be tested together

## Monorepo Workflow

1. Run `bun install` after modifying any `package.json`
2. Run `bun run build` after TypeScript changes before testing
3. Use `bun add <dep> --workspace` to add inter-workspace dependencies
4. Follow the dependency graph: `apps/github-action` → `packages/core` + `packages/ai-engine`

## Additional Guidelines

- Bun automatically loads `.env` files - do not use dotenv
- Prefer `Bun.file()` over `node:fs` for file operations
- Use `bun:sqlite` if local storage is needed (not better-sqlite3)
- GitHub Action bundle target: **node** (ESM modules)

## Existing Cursor Rules

The following Cursor rules exist in `.cursor/rules/`:

1. **lazypr-coding-rules.md**: Core project conventions including monorepo patterns and functional programming
2. **use-bun-instead-of-node-vite-npm-pnpm.mdc**: Bun-specific tooling and API guidance

These rules are automatically applied when working in this repository. Ensure consistency with these rules when making changes.
