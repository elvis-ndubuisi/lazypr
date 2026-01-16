export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
}

const TEMPLATES: Record<string, PromptTemplate> = {
  securityFocused: {
    name: "Security Focused",
    description: "Emphasize security implications",
    template: "Analyze this PR with a focus on security concerns...",
  },
  concise: {
    name: "Concise",
    description: "Brief summary only",
    template: "Provide a brief summary of this PR...",
  },
  verbose: {
    name: "Verbose",
    description: "Detailed analysis",
    template: "Provide a detailed analysis of this PR...",
  },
};

export const templates: { [K in keyof typeof TEMPLATES]: PromptTemplate } = TEMPLATES;

export function getTemplate(name: string): PromptTemplate {
  const key = name as keyof typeof TEMPLATES;
  if (key in TEMPLATES) {
    return TEMPLATES[key] as PromptTemplate;
  }
  return TEMPLATES.concise as PromptTemplate;
}
