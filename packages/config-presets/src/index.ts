export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  systemPrompt?: string;
}

const TEMPLATES: Record<string, PromptTemplate> = {
  securityFocused: {
    name: "Security Focused",
    description: "Emphasize security implications, auth changes, and potential vulnerabilities",
    template: `You are an expert code reviewer. Generate a concise Markdown PR summary with a security focus.

Constraints:
- Use only Markdown (no code fences).
- Do not include a top-level title heading.
- Do not invent changes that are not in the diff.

PR Context:
- Title: {{prTitle}}
- Author: {{prAuthor}}
- Existing description: {{prBody}}

Risk Signals (precomputed):
- Risk level: {{riskLevel}}
- Risk score: {{riskScore}}/100
- High-risk files: {{highRiskFiles}}
- File breakdown: {{fileBreakdown}}

Files changed:
{{filesChanged}}

Diff:
{{diff}}

Output format (exact headings):
### TL;DR
<1-2 sentences>

### Key Changes
- <bullets>

### Security Analysis
- <bullets about auth, secrets, validation, dependencies, permissions, DB risks>

### Reviewer Checklist
- <bullets>`,
  },
  concise: {
    name: "Concise",
    description: "Brief summary only",
    template: `You are a helpful assistant that summarizes pull requests concisely.

Constraints:
- Use only Markdown (no code fences).
- Do not include a top-level title heading.
- Do not include the full diff back in the output.
- Keep it short.

PR Context:
- Title: {{prTitle}}
- Author: {{prAuthor}}

Risk Signals (precomputed):
- Risk level: {{riskLevel}}
- Risk score: {{riskScore}}/100

Files changed:
{{filesChanged}}

Diff:
{{diff}}

Output format (exact headings):
### TL;DR
<1 sentence>

### Key Changes
- <3-6 bullets>`,
    systemPrompt:
      "You are a helpful assistant that summarizes pull requests concisely. Keep your response brief and focused on the most important changes.",
  },
  verbose: {
    name: "Verbose",
    description: "Detailed analysis with file breakdown",
    template: `You are an expert reviewer. Produce a Detailed PR Analysis and a detailed Markdown PR summary.

Constraints:
- Use only Markdown (no code fences).
- Do not include a top-level title heading.
- Do not invent changes that are not in the diff.

PR Context:
- Title: {{prTitle}}
- Author: {{prAuthor}}
- Existing description: {{prBody}}

Risk Signals (precomputed):
- Risk level: {{riskLevel}}
- Risk score: {{riskScore}}/100
- High-risk files: {{highRiskFiles}}
- File breakdown: {{fileBreakdown}}

Files changed:
{{filesChanged}}

Diff:
{{diff}}

Output format (exact headings):
### TL;DR
<2-3 sentences>

### Key Changes
- <bullets>

### Notes for Reviewers
- <bullets>

### Reviewer Checklist
- <bullets>`,
  },
  default: {
    name: "Default",
    description: "Standard PR summary template",
    template: `You are lazypr, an assistant that generates clear PR summaries from diffs.

Constraints:
- Use only Markdown (no code fences).
- Do not include a top-level title heading.
- Do not invent changes that are not in the diff.

PR Context:
- Title: {{prTitle}}
- Author: {{prAuthor}}
- Existing description: {{prBody}}

Risk Signals (precomputed):
- Risk level: {{riskLevel}}
- Risk score: {{riskScore}}/100
- High-risk files: {{highRiskFiles}}
- File breakdown: {{fileBreakdown}}

Files changed:
{{filesChanged}}

Diff:
{{diff}}

Output format (exact headings):
### TL;DR
<1-2 sentences>

### Key Changes
- <bullets>

### Notes for Reviewers
- <bullets>

### Reviewer Checklist
- <bullets>`,
  },
};

export const templates: Record<string, PromptTemplate> = TEMPLATES;

export function getTemplate(name: string): PromptTemplate {
  const resolvedName = resolveTemplateName(name);
  const key = resolvedName as keyof typeof TEMPLATES;
  if (key in TEMPLATES) {
    const result = TEMPLATES[key];
    return result as PromptTemplate;
  }
  return TEMPLATES.default as PromptTemplate;
}

export function getAllTemplates(): PromptTemplate[] {
  return Object.values(TEMPLATES);
}

export function templateExists(name: string): boolean {
  const resolvedName = resolveTemplateName(name);
  const key = resolvedName as keyof typeof TEMPLATES;
  return key in TEMPLATES;
}

export function resolveTemplateName(input: string): string {
  const normalized = input.toLowerCase().replace(/[-_\s]/g, "");
  const mapping: Record<string, keyof typeof TEMPLATES> = {
    security: "securityFocused",
    securityfocused: "securityFocused",
    concise: "concise",
    brief: "concise",
    short: "concise",
    simple: "concise",
    verbose: "verbose",
    detailed: "verbose",
    detailedanalysis: "verbose",
    full: "verbose",
    standard: "default",
  };
  return mapping[normalized] ?? "default";
}
