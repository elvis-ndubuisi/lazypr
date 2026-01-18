import { getTemplate } from "@lazypr/config-presets";
import {
  type LLMProvider,
  createGeminiProProvider,
  createGeminiProvider,
} from "./gemini-provider.js";
import { ImpactScorer } from "./impact-scorer.js";
import type { SummarizerOptions, SummaryResult } from "./types.js";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.3;

/**
 * System prompt for Gemini-based PR summarization.
 *
 * This prompt instructs Gemini to analyze git diffs and generate comprehensive
 * PR summaries with impact scoring, ghost commit detection, and reviewer checklists.
 */
const GEMINI_SYSTEM_PROMPT = `You are an expert code reviewer and PR summarizer. Your task is to analyze git diffs and provide comprehensive PR summaries.

You have access to the ENTIRE git diff with Gemini 2.5 Flash's 1M token context window, so you can analyze the complete diff without truncation.

## Required Analysis

1. **PR Summary**: Provide a clear, concise summary of what this PR does
2. **Impact Score**: Calculate an impact score from 0-100 based on:
   - HIGH risk (30-40 points): Auth, schema, permissions, secrets, migrations
   - MEDIUM risk (10-20 points): Controllers, services, routes, business logic
   - LOW risk (1-5 points): Tests, docs, configs
3. **Ghost Commit Detection**: Identify commits where the message doesn't match the code changes
4. **Reviewer Checklist**: Generate context-aware checklist items

## Output Format

Provide your analysis in Markdown format with these sections:

### Summary
<Brief summary of the PR>

### Impact Assessment
- **Score**: <0-100>
- **Risk Level**: LOW | MEDIUM | HIGH
- **Key Areas**: <List of affected areas>

### Ghost Commit Analysis
<Any detected discrepancies between commit messages and code changes>

### Reviewer Checklist
- [ ] <Context-specific checklist items>

---

IMPORTANT: Use the complete diff provided. Do not ask for more information.`;

/**
 * Generates a PR summary using Gemini 2.5 Flash.
 *
 * This function leverages Gemini's 1M token context window to analyze
 * the complete diff without truncation, providing comprehensive summaries.
 *
 * @param diff - The git diff to analyze
 * @param changedFiles - Array of file paths that were changed
 * @param options - Optional configuration for template, model, and API key
 * @returns Promise resolving to a SummaryResult with summary, risk level, checklist, and token usage
 *
 * @example
 * ```typescript
 * const result = await generatePRSummarForGemini(diff, ["src/auth.ts", "tests/auth.test.ts"], {
 *   templateName: "security",
 *   apiKey: process.env.GEMINI_API_KEY
 * });
 * console.log(result.summary);
 * console.log(result.riskLevel);
 * ```
 */
export async function generatePRSummarForGemini(
  diff: string,
  changedFiles: string[],
  options?: SummarizerOptions,
): Promise<SummaryResult> {
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY ?? "";
  const model = options?.model ?? "gemini-2.5-flash";

  const provider = createGeminiProvider(apiKey);

  const scorer = new ImpactScorer();
  const riskSummary = scorer.getRiskSummary(changedFiles);
  const riskLevel = riskSummary.overall;

  let template = options?.customTemplate;

  if (!template) {
    const templateObj = getTemplate(options?.templateName ?? "default");
    template = templateObj.template;
  }

  const systemPrompt: string = options?.systemPrompt ?? GEMINI_SYSTEM_PROMPT;

  const prompt = buildGeminiPrompt(template, diff, changedFiles, riskLevel, riskSummary);

  const completion = await provider.complete(prompt, {
    model,
    maxTokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
    systemPrompt,
  });

  const summary = parseGeminiResponse(completion.text, riskLevel);

  return {
    summary,
    riskLevel,
    checklist: generateDefaultChecklist(changedFiles, riskLevel),
    ghostCommits: [],
    impactScore: riskSummary.score,
    tokensUsed: {
      input: completion.usage.inputTokens,
      output: completion.usage.outputTokens,
    },
  };
}

interface PromptVariables {
  diff: string;
  filesChanged: string;
  riskLevel: string;
  riskScore: string;
  highRiskFiles: string;
  fileBreakdown: string;
}

function buildGeminiPrompt(
  template: string,
  diff: string,
  files: string[],
  riskLevel: string,
  riskSummary: {
    score: number;
    breakdown: { high: number; medium: number; low: number };
    highRiskFiles: string[];
  },
): string {
  const variables: PromptVariables = {
    diff: diff,
    filesChanged: files.join(", "),
    riskLevel: riskLevel,
    riskScore: String(riskSummary.score),
    highRiskFiles: riskSummary.highRiskFiles.join(", ") || "None",
    fileBreakdown: `${String(riskSummary.breakdown.high)} high-risk, ${String(riskSummary.breakdown.medium)} medium-risk, ${String(riskSummary.breakdown.low)} low-risk files`,
  };

  let prompt = template;

  prompt = prompt.replace(/\{\{diff\}\}/g, variables.diff);
  prompt = prompt.replace(/\{\{filesChanged\}\}/g, variables.filesChanged);
  prompt = prompt.replace(/\{\{riskLevel\}\}/g, variables.riskLevel);
  prompt = prompt.replace(/\{\{riskScore\}\}/g, variables.riskScore);
  prompt = prompt.replace(/\{\{highRiskFiles\}\}/g, variables.highRiskFiles);
  prompt = prompt.replace(/\{\{fileBreakdown\}\}/g, variables.fileBreakdown);

  prompt = prompt.replace(/\{\{prTitle\}\}/g, "(Available in PR context)");
  prompt = prompt.replace(/\{\{prBody\}\}/g, "(Available in PR context)");
  prompt = prompt.replace(/\{\{prAuthor\}\}/g, "(Available in PR context)");

  return prompt;
}

function parseGeminiResponse(response: string, riskLevel: string): string {
  let summary = response.trim();

  const sectionMarkers = [
    "## Summary",
    "### Summary",
    "TL;DR",
    "**TL;DR**",
    "## 🚀 PR Summary",
    "## PR Summary",
  ];

  for (const marker of sectionMarkers) {
    const markerIndex = summary.toLowerCase().indexOf(marker.toLowerCase());
    if (markerIndex >= 0) {
      const newlineIndex = summary.indexOf("\n", markerIndex);
      if (newlineIndex > 0) {
        summary = summary.substring(newlineIndex + 1).trim();
      }
      break;
    }
  }

  if (!summary.toLowerCase().includes("risk")) {
    const riskHeader = `### Risk Assessment: ${riskLevel}\n\n`;
    summary = riskHeader + summary;
  }

  return summary;
}

function generateDefaultChecklist(files: string[], riskLevel: string): string[] {
  const checklist: string[] = [];

  checklist.push("Code follows project conventions");
  checklist.push("Tests pass locally");

  if (riskLevel === "HIGH") {
    checklist.push("Security review completed");
    checklist.push("Data migration verified");
  }

  if (riskLevel === "MEDIUM") {
    checklist.push("Edge cases considered");
  }

  const hasSql = files.some((f) => /\.sql$/i.test(f));
  if (hasSql) {
    checklist.push("Migration is reversible");
    checklist.push("Database backup verified");
  }

  const hasAuth = files.some((f) => /auth|login|logout|permission|role/i.test(f));
  if (hasAuth) {
    checklist.push("Authentication flow tested");
    checklist.push("Authorization checks verified");
  }

  const hasApi = files.some((f) => /controller|route|endpoint|handler|api/i.test(f));
  if (hasApi) {
    checklist.push("API documentation updated");
    checklist.push("Response format verified");
  }

  return checklist;
}

/**
 * Creates a Gemini Flash provider optimized for PR summarization.
 *
 * This is an alias for createGeminiProvider that explicitly uses
 * the Gemini 2.5 Flash model.
 *
 * @param apiKey - Google AI API key (uses GEMINI_API_KEY env var if not provided)
 * @returns An LLMProvider instance configured for Gemini 2.5 Flash
 */
export function createGeminiFlashProvider(apiKey: string): LLMProvider {
  return createGeminiProvider(apiKey);
}
