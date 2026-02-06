
![LazyPR Banner](assets/lazypr-banner.png)

<a href="https://github.com/elvis-ndubuisi/lazypr">
  <img src="https://img.shields.io/badge/Using-LazyPR-blueviolet?style=flat-square&logo=github" height="20">
</a>

**lazypr** is an AI-powered GitHub Action that rescues your repository from "lazy" documentation and "updated auth" as a PR title. It automatically generates high-context Pull Request summaries, risk assessments, and change logs directly from your code diffs.

## ✨ Why lazypr?

Most AI summarizers just look at commit messages. **lazypr** looks at the code.

- **Ghost Commit Detection:** Flags when code changes don't match the developer's commit descriptions.
- **Impact Scoring:** Automatically labels PRs as `Low`, `Medium`, or `High` risk based on file sensitivity.
- **Bring Your Own Key (BYOK):** Use your own OpenAI, Anthropic, or Gemini API key.
- **Developer-First:** Built as a lightning-fast Bun monorepo, compiled for Node.js runtime.

---

## 🌍 Trusted by Forward-Thinking Teams

> **Is your project using LazyPR?** We'd love to feature you! To support the project and be added to this section, please [open a PR](https://github.com/elvis-ndubuisi/lazypr/compare) and include your project's icon/link.


<a href="https://hopmembers.com">
  <img src="https://www.google.com/s2/favicons?domain=hopmembers.com&sz=128" height="40" width="40" alt="hopmembers" style="vertical-align: middle; border-radius: 50%;">
</a>
<a href="https://usekonsent.netlify.app">
  <img src="https://www.google.com/s2/favicons?domain=usekonsent.netlify.app&sz=128" height="40" width="40" alt="useKonsent" style="vertical-align: middle; border-radius: 50%;">
</a>



## 🏗️ Project Structure

This project is managed as a **Bun Monorepo**:

```text
lazypr/
├── apps/
│   └── github-action/    # The entry point for GitHub Actions (bundled for Node)
├── packages/
│   ├── core/             # Git logic, diff sanitization, and "Ghost" detection
│   ├── ai-engine/        # Multi-provider LLM orchestration
│   └── config-presets/   # Built-in prompt templates
└── package.json          # Workspace configurations

```

---

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2+ installed.
- A GitHub Personal Access Token (for local testing).
- An LLM API Key (OpenAI, Anthropic, etc).

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
- uses: elvis-ndubuisi/lazypr@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    api_key: ${{ secrets.GEMINI_API_KEY }} # or OPENAI_API_KEY / ANTHROPIC_API_KEY
    provider: gemini # openai, anthropic, or gemini
    template: default # or concise, verbose, security
    # Optional: custom prompt template
    custom_template: true
    custom_template_path: ".github/lazypr-template.md"
```

## 📚 Documentation

- `docs/USER_GUIDE.md`
- `docs/TEMPLATES.md`
- `docs/DEVELOPMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/SPEC.md`

---

## 🤝 Contributing

This is an open-source project. We value logic over "paperwork."

1. Fork it.
2. `bun install`
3. Write code that matters.
4. Let **lazypr** write the PR summary for you.
