# Changelog

All notable changes to lazypr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
