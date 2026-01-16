# LazyPR Vibe Coding Rules

- **Package Manager**: Always use `bun`. Never suggest `npm install` or `pnpm`.
- **Monorepo Pattern**: We use Bun Workspaces. When adding a dependency to `apps/github-action` that exists in `packages/core`, use `bun add @lazypr/core --workspace`.
- **Code Style**:
  - Prefer functional programming patterns.
  - Use `export` at the top level.
  - Strict TypeScript; provide interfaces for all LLM payloads.
- **Git Context**: When writing logic for `packages/core`, use `@actions/github` context to access PR metadata.
- **Workflow**: Before implementing a feature, "think" (reason) about the impact on the other packages in the monorepo.
