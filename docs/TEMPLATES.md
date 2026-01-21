# Templates

`lazypr` supports:

- **Built-in presets** from `packages/config-presets/src/index.ts`
- **Custom templates** stored in the target repository

## Template variables

These placeholders may be used in templates:

- **PR metadata**
  - `{{prTitle}}`
  - `{{prAuthor}}`
  - `{{prBody}}`
- **Diff context**
  - `{{filesChanged}}`
  - `{{diff}}`
- **Risk context (precomputed)**
  - `{{riskLevel}}`
  - `{{riskScore}}`
  - `{{highRiskFiles}}`
  - `{{fileBreakdown}}`

## Custom template requirements

A custom template must include:

- `{{diff}}`
- `{{filesChanged}}`

## Where custom templates are loaded from

If `custom_template` is enabled, the action checks these paths (first match wins):

1. `custom_template_path` (if provided)
2. `.github/lazypr-template.md`
3. `.lazypr/template.md`
4. `lazypr-template.md`

## Recommended custom template (starter)

```md
You are an expert reviewer. Produce a concise Markdown summary.

PR:
- Title: {{prTitle}}
- Author: {{prAuthor}}

Risk:
- {{riskLevel}} ({{riskScore}}/100)
- High-risk files: {{highRiskFiles}}

Files:
{{filesChanged}}

Diff:
{{diff}}

Output format:
### TL;DR
<1-2 sentences>

### Key Changes
- <bullets>

### Notes for Reviewers
- <bullets>
```
