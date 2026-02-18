# Changelog

All notable changes to lazypr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **GitHub Action runtime**: Resolved "Could not find file '.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc'" when running the action on GitHub-hosted runners. The `.cursor` directory contained a broken symlink (pointing to non-existent `CLAUDE.md`) and was being checked out with the action; Cursor-related tooling on the runner attempted to read it and failed. `.cursor` is now in `.gitignore` and untracked, so it is no longer shipped with the published action. Your local `.cursor` rules and skills remain for development; only the repository copy used by the marketplace is affected.

## [1.0.4] - 2026-01-18

### Security

- **Removed leaked API key**: Deleted v1.0.2 release which contained an exposed API key in release notes
- Fixed typo in release template: `@v` instead of `@@v`

## [1.1.0] - 2026-01-19

### Changed

- **Templates**: Refactored to AI instruction format with structured constraints
  - New template format: AI instruction prefix with output format requirements
  - Added explicit sections: TL;DR, Key Changes, Security Analysis, Reviewer Checklist
  - Improved prompt engineering for better, more consistent outputs
  - Templates now include constraints like "Use only Markdown" and "Do not invent changes"

- **Release Workflow**: Simplified to verify-only approach
  - Removed auto-commit step that pushed back to the branch
  - Added explicit file verification for marketplace compliance
  - Requires `action.yml` and `dist/index.js` to exist in the tagged commit

### Added

- **Documentation**: Comprehensive documentation suite
  - `docs/ARCHITECTURE.md` - System design and component overview
  - `docs/DEVELOPMENT.md` - Setup, workflow, and development guide
  - `docs/ISSUE_TICKETS.md` - Templates for feature requests and bug reports
  - `docs/TEMPLATES.md` - Reference guide for all templates
  - `docs/USER_GUIDE.md` - End-user documentation with examples

- **Type Safety**: New explicit type definitions
  - `apps/github-action/src/octokit-types.ts` - Dedicated Octokit type definitions
  - Improved TypeScript strictness across action source files

### Fixed

- **Code Quality**: Cleaned up unused imports across action source files
- **Model Input Handling**: Simplified model input logic with proper trimming
- **Import Organization**: Consolidated imports in core action files

### Developer Experience

- **Cursor Integration**: Added Cursor skills for refactor planning
  - `.cursor/skills/lazypr-refactor-planning/SKILL.md`
  - Scripts for scaffolding refactor specifications

## [1.0.0] - 2026-01-18

### Added

- **Google Gemini Support**: Added native support for Gemini 2.5 Flash via LangChain.js
  - New provider option: `gemini`
  - Uses 1M token context window (800K effective limit)
  - Falls back to `gemini-2.5-flash` model by default

- **LangChain.js Integration**: Migrated from direct SDK calls to LangChain abstraction
  - Unified `LLMProvider` interface across all providers
  - Easier extensibility for future providers
  - Better streaming support

- **Diff Sanitization**: New filtering system for PR diffs
  - Excludes lockfiles (`package-lock.json`, `yarn.lock`, etc.)
  - Filters non-code assets (images, binaries)
  - Filters test and config files based on user preferences

- **Token Management**: Smart context truncation based on provider limits
  - Gemini: 800K tokens
  - Anthropic: 150K tokens
  - OpenAI: 100K tokens
  - Prioritizes high-risk files when truncating

### Changed

- **Multi-Provider Default Models**:
  - OpenAI: `gpt-4-turbo`
  - Anthropic: `claude-sonnet-4-20250514`
  - Gemini: `gemini-2.5-flash`
  - Auto-detects correct model based on provider setting

- **Improved Ghost Commit Detection**: Better commit message analysis

### Fixed

- **Model Default Override**: Fixed issue where `gpt-4-turbo` was used even when Gemini provider was selected

### Removed

- Removed duplicate test workflows
- Removed test files (`test-gemini.ts`, `test-gemini.diff`)

## [0.1.0] - 2026-01-16

### Added

- Initial release of lazypr AI PR Summary
- OpenAI GPT-4 Turbo support
- Anthropic Claude support
- Ghost Commit detection
- Impact scoring and risk assessment
- Automated PR description updates
- Reviewer checklist generation
