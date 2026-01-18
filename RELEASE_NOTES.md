# lazypr v1.0.0 Release Notes

## Overview

lazypr v1.0.0 introduces **Google Gemini support** via LangChain.js, plus diff sanitization and smart token management for handling large PRs.

## What's New

### Gemini Integration

```yaml
steps:
  - uses: elvis-ndubuisi/lazypr@v1.0.0
    with:
      provider: gemini
      api_key: ${{ secrets.GEMINI_API_KEY }}
      github_token: ${{ secrets.GITHUB_TOKEN }}
```

**Benefits:**
- 1M token context window (800K effective)
- Fast inference with Gemini 2.5 Flash
- Cost-effective for large diffs

### Multi-Provider Support

| Provider | Default Model | Context Window |
|----------|--------------|----------------|
| OpenAI | gpt-4-turbo | 128K |
| Anthropic | claude-sonnet-4-20250514 | 200K |
| Gemini | gemini-2.5-flash | 1M |

### Smart Diff Sanitization

Automatic filtering of:
- Lockfiles (`package-lock.json`, `yarn.lock`, etc.)
- Non-code assets (images, binaries)
- Config files and tests (optional)

### Token-Aware Truncation

When diffs exceed provider limits, low-risk files are removed first to preserve critical context.

## Migration from v0.1.0

No breaking changes. Existing workflows using OpenAI or Anthropic continue to work unchanged.

To use Gemini, simply add:
```yaml
provider: gemini
```

## Full Example

```yaml
name: AI PR Summary
on: [pull_request]

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

      - uses: elvis-ndubuisi/lazypr@v1.0.0
        with:
          provider: gemini  # or "openai" or "anthropic"
          api_key: ${{ secrets.GEMINI_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          template: default  # or "concise", "verbose", "security"
```

## Credits

Built with:
- [LangChain.js](https://js.langchain.com/)
- [GitHub Actions](https://github.com/features/actions)
- [Bun](https://bun.sh/)
