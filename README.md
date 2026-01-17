# 🚀 LazyPR

**lazypr** is an AI-powered GitHub Action that rescues your repository from "lazy" documentation and "updated auth" as a PR title. It automatically generates high-context Pull Request summaries, risk assessments, and change logs directly from your code diffs.

## ✨ Why lazypr?

Most AI summarizers just look at commit messages. **lazypr** looks at the code.

- **Ghost Commit Detection:** Flags when code changes don't match the developer's commit descriptions.
- **Impact Scoring:** Automatically labels PRs as `Low`, `Medium`, or `High` risk based on file sensitivity.
- **Bring Your Own Key (BYOK):** Use your own OpenAI, Anthropic, or local LLM keys via Bun/Node environment variables.
- **Developer-First:** Built as a lightning-fast Bun monorepo, compiled for Node.js runtime.

---

## 🏗️ Project Structure

This project is managed as a **Bun Monorepo**:

```text
lazypr/
├── apps/
│   └── github-action/    # The entry point for GitHub Actions (bundled for Node)
├── packages/
│   ├── core/             # Git logic, diff sanitization, and "Ghost" detection
│   └── ai-engine/        # Multi-provider LLM orchestration
└── package.json          # Workspace configurations

```

---

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2+ installed.
- A GitHub Personal Access Token (for local testing).
- An LLM API Key (OpenAI/Anthropic).

### Installation

```bash
# Install all dependencies across the workspace
bun install

```

### Development

To run the core logic locally against a specific repository:

```bash
# Navigate to the core package
cd packages/core
bun run test

```

### Building for Production

Since GitHub Actions require a single JavaScript file, we bundle the app using Bun's native bundler targeted at Node.js:

```bash
bun run build

```

---

## ⚙️ Configuration

Add this to your repository's `.github/workflows/lazypr.yml`:

```yaml
- uses: your-username/lazypr@v1
  with:
    api_key: ${{ secrets.OPENAI_API_KEY }}
    model: "gpt-4-turbo"
    # Optional: custom prompt template
    template: ".github/lazypr-template.md"
```

---

## 🤝 Contributing

This is an open-source project. We value logic over "paperwork."

1. Fork it.
2. `bun install`
3. Write code that matters.
4. Let **lazypr** write the PR summary for you.
# Test Update
