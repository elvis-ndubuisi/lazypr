export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Represents the result of generating a PR summary.
 */
export interface SummaryResult {
  /** The generated markdown summary of the PR */
  summary: string;
  /** The overall risk level assessment (LOW, MEDIUM, or HIGH) */
  riskLevel: RiskLevel;
  /** Checklist items for reviewers */
  checklist: string[];
  /** Any detected ghost commits with details */
  ghostCommits: Array<{
    sha: string;
    message: string;
    detected: boolean;
    reason?: string;
  }>;
  /** Impact score from 0-100 based on changed files */
  impactScore: number;
  /** Token usage statistics from the LLM */
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Options for configuring the summarization process.
 */
export interface SummarizerOptions {
  /** Name of the template to use (e.g., "security", "concise", "verbose") */
  templateName?: string;
  /** LLM provider to use ("openai", "anthropic", or "gemini") */
  provider?: "openai" | "anthropic" | "gemini";
  /** Specific model to use (overrides provider default) */
  model?: string;
  /** API key for the LLM provider (optional, uses env var if not provided) */
  apiKey?: string;
  /** Pull Request title (used in prompt variables) */
  prTitle?: string;
  /** Existing Pull Request description/body (used in prompt variables) */
  prBody?: string;
  /** Pull Request author username (used in prompt variables) */
  prAuthor?: string;
  /** Custom system prompt to use instead of template default */
  systemPrompt?: string;
  /** Custom prompt template string */
  customTemplate?: string;
  /** Maximum tokens in the response */
  maxTokens?: number;
  /** Temperature for LLM sampling (0-1, lower = more deterministic) */
  temperature?: number;
}

/**
 * Represents the risk assessment for a single file.
 */
export interface FileImpact {
  /** The file path */
  file: string;
  /** The risk level assigned to this file */
  riskLevel: RiskLevel;
  /** Reasons why this risk level was assigned */
  reasons: string[];
}

/**
 * Represents a checklist item for reviewers.
 */
export interface ChecklistItem {
  /** The checklist item text */
  text: string;
  /** Priority level of this checklist item */
  priority: "HIGH" | "MEDIUM" | "LOW";
  /** Category for grouping checklist items */
  category: string;
}

/**
 * Options for configuring the ImpactScorer with custom patterns.
 */
export interface ImpactScorerOptions {
  /** Custom patterns to add to the default risk assessment patterns */
  customPatterns?: Array<{ pattern: RegExp; riskLevel: RiskLevel; reason: string }>;
}
