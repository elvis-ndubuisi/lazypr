export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface SummaryResult {
  summary: string;
  riskLevel: RiskLevel;
  checklist: string[];
  ghostCommits: Array<{
    sha: string;
    message: string;
    detected: boolean;
    reason?: string;
  }>;
  impactScore: number;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface SummarizerOptions {
  templateName?: string;
  provider?: "openai" | "anthropic";
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  customTemplate?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface FileImpact {
  file: string;
  riskLevel: RiskLevel;
  reasons: string[];
}

export interface ChecklistItem {
  text: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
}

export interface ImpactScorerOptions {
  customPatterns?: Array<{ pattern: RegExp; riskLevel: RiskLevel; reason: string }>;
}
