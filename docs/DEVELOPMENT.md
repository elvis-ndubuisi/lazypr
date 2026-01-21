# Development

This repo is a Bun monorepo (Turborepo).

## Prerequisites

- Bun v1.2+

## Install

```bash
bun install
```

## Lint / Test / Build

```bash
bun run lint
bun run test
bun run build
```

## Bundle for GitHub Marketplace

GitHub Marketplace requires the repository root to contain:

- `action.yml`
- `dist/index.js`

Use:

```bash
bun run bundle:marketplace
```

This builds the action in `apps/github-action/dist/index.js` and copies it to `dist/index.js`.

## Release workflow notes

- `.github/workflows/test.yml` verifies the Marketplace bundle is up-to-date by rebuilding and checking for diffs.
- `.github/workflows/release.yml` creates a release for tags `v*` and verifies the tagged commit already contains an up-to-date `dist/index.js` bundle.
