# lazypr Summary Templates

This directory contains a collection of specialized and generic templates for the **lazypr** AI-powered GitHub Action. These templates allow you to customize how the AI summarizes your Pull Requests based on your specific needs or audience.

## 🌐 GitHub Repository

You can find all these templates online at:
[https://github.com/elvis-ndubuisi/lazypr/tree/main/templates](https://github.com/elvis-ndubuisi/lazypr/tree/main/templates)

## 🚀 How to Use These Templates

### Option 1: The Default Template (Easiest)
Copy any template file to `.github/lazypr-template.md` in your repository. lazypr will automatically detect and use it without any extra configuration.

### Option 2: Switching Templates in Workflow
To use a specific template for a specific project or workflow, use the `custom_template_path` input in your `.github/workflows/lazypr.yml`:

```yaml
- uses: elvis-ndubuisi/lazypr@v1
  with:
    api_key: ${{ secrets.GEMINI_API_KEY }}
    provider: gemini
    custom_template: true
    custom_template_path: templates/freelancer.md  # Path to your desired template
```

---

## 📂 Available Templates

### 💼 Scenario-Specific
- **[Freelancer](freelancer.md)**: Focuses on "Value Delivered" and "Requirements Completed" to keep clients happy and informed.
- **[Open Source](open-source.md)**: Emphasizes community standards, related issues, and a detailed quality checklist.
- **[Organization](organization.md)**: Staff-engineer level summary focusing on architecture, security, and operational impact.
- **[Personal](personal.md)**: A reflective format focusing on "Lessons Learned" and "Future TODOs" for your own growth.

### 🛠 Generic Use Cases
- **[Bug Fix](bug-fix.md)**: Highlights the "Before and After" and the technical root cause.
- **[New Feature](new-feature.md)**: Focuses on the user experience and provides usage examples.
- **[Refactor](refactor.md)**: Explains the motivation behind changes while assuring no functional regressions.
- **[Security](security.md)**: High-urgency format for vulnerability mitigation and risk assessment.
- **[Documentation](documentation.md)**: Tracks changes in clarity, target audience, and link accuracy.
- **[Minimalist](minimalist.md)**: A lightning-fast, 3-bullet summary for rapid development.

---

## 🧩 Template Placeholders

When creating or editing these templates, you can use the following dynamic placeholders:

| Placeholder | Description |
| :--- | :--- |
| `{{diff}}` | **Required.** The sanitized git diff of the PR. |
| `{{filesChanged}}` | **Required.** List of files that were modified. |
| `{{prTitle}}` | The title of the Pull Request. |
| `{{prAuthor}}` | The GitHub username of the PR author. |
| `{{prBody}}` | The existing PR description. |
| `{{riskLevel}}` | Precomputed risk (Low, Medium, High, Critical). |
| `{{riskScore}}` | A numerical risk score (0-100). |
| `{{highRiskFiles}}` | List of files identified as high-risk. |

---

## 🎨 Design Rules
- Templates should be written as **AI Instructions**.
- Use **Markdown** but avoid code fences (triple backticks) within the instruction block unless you want the AI to output them.
- Focus on the **Output Format** section at the bottom of the template to define the structure you want.
