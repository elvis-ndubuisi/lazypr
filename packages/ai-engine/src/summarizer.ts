import { getTemplate } from "@lazypr/config-presets";
import { ImpactScorer } from "./impact-scorer.js";
import { type LLMProvider, type LLMProviderType, createLangChainProvider } from "./index.js";
import type { RiskLevel, SummarizerOptions, SummaryResult } from "./types.js";

const DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_TEMPERATURE = 0.3;

export async function generatePRSummar(
  diff: string,
  changedFiles: string[],
  options?: SummarizerOptions,
): Promise<SummaryResult> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const providerType = (options?.provider ?? "openai") as LLMProviderType;
  const model = options?.model ?? getDefaultModel(providerType);

  const provider = createLangChainProvider({
    provider: providerType,
    apiKey,
    model,
  });

  const scorer = new ImpactScorer();
  const riskSummary = scorer.getRiskSummary(changedFiles);
  const riskLevel = riskSummary.overall;

  let template = options?.customTemplate;

  if (!template) {
    const templateObj = getTemplate(options?.templateName ?? "default");
    template = templateObj.template;
  }

  const systemPrompt: string | undefined = options?.systemPrompt;

  const prompt = buildPrompt(template, {
    prTitle: options?.prTitle ?? "",
    prBody: options?.prBody ?? "",
    prAuthor: options?.prAuthor ?? "",
    diff: truncateDiff(diff, 15000),
    filesChanged: changedFiles.join(", "),
    riskLevel,
    riskScore: String(riskSummary.score),
    highRiskFiles: riskSummary.highRiskFiles.join(", ") || "None",
    fileBreakdown: formatFileBreakdown(riskSummary),
  });

  const completion = await provider.complete(prompt, {
    model,
    maxTokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
    systemPrompt,
  });

  const summary = parseSummaryFromResponse(completion.text);

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

function getDefaultModel(provider: LLMProviderType): string {
  switch (provider) {
    case "anthropic":
      return "claude-sonnet-4-20250514";
    case "openai":
      return "gpt-4-turbo";
    case "gemini":
      return "gemini-2.5-flash";
    default:
      return "gpt-4-turbo";
  }
}

interface PromptVariables {
  prTitle: string;
  prBody: string;
  prAuthor: string;
  diff: string;
  filesChanged: string;
  riskLevel: RiskLevel;
  riskScore: string;
  highRiskFiles: string;
  fileBreakdown: string;
}

function buildPrompt(template: string, variables: PromptVariables): string {
  let prompt = template;

  prompt = prompt.replace(/\{\{diff\}\}/g, variables.diff);
  prompt = prompt.replace(/\{\{filesChanged\}\}/g, variables.filesChanged);
  prompt = prompt.replace(/\{\{riskLevel\}\}/g, variables.riskLevel);
  prompt = prompt.replace(/\{\{riskScore\}\}/g, variables.riskScore);
  prompt = prompt.replace(/\{\{highRiskFiles\}\}/g, variables.highRiskFiles);
  prompt = prompt.replace(/\{\{fileBreakdown\}\}/g, variables.fileBreakdown);

  prompt = prompt.replace(/\{\{prTitle\}\}/g, variables.prTitle || "Untitled PR");
  prompt = prompt.replace(/\{\{prBody\}\}/g, variables.prBody || "(No existing PR description)");
  prompt = prompt.replace(/\{\{prAuthor\}\}/g, variables.prAuthor || "unknown");

  return prompt;
}

function truncateDiff(diff: string, maxLength: number): string {
  if (diff.length <= maxLength) {
    return diff;
  }

  const headerEnd = diff.indexOf("\n@@");
  let truncated: string;

  if (headerEnd > 0 && headerEnd < maxLength * 0.3) {
    const header = diff.substring(0, headerEnd);
    const remaining = maxLength - header.length - 100;
    const bodyStart = diff.indexOf("\n+", headerEnd);
    if (bodyStart > 0) {
      const body = diff.substring(bodyStart, bodyStart + remaining);
      truncated = `${header}\n... (truncated for brevity) ...\n${body}`;
    } else {
      truncated = `${diff.substring(0, maxLength)}\n... (truncated) ...`;
    }
  } else {
    truncated = `${diff.substring(0, maxLength)}\n... (truncated) ...`;
  }

  return truncated;
}

function formatFileBreakdown(riskSummary: {
  breakdown: { high: number; medium: number; low: number };
}): string {
  const { high, medium, low } = riskSummary.breakdown;
  const lines: string[] = [];

  if (high > 0) {
    lines.push(`${high} high-risk file(s)`);
  }
  if (medium > 0) {
    lines.push(`${medium} medium-risk file(s)`);
  }
  if (low > 0) {
    lines.push(`${low} low-risk file(s)`);
  }

  return lines.join(", ") || "No files changed";
}

function parseSummaryFromResponse(response: string): string {
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

  const fenceIndex = summary.indexOf("```");
  if (fenceIndex >= 0) {
    const endFenceIndex = summary.indexOf("```", fenceIndex + 3);
    if (endFenceIndex > fenceIndex) {
      const before = summary.substring(0, fenceIndex).trim();
      const after = summary.substring(endFenceIndex + 3).trim();
      summary = `${before}\n${after}`;
    }
  }

  return summary;
}

function generateDefaultChecklist(files: string[], riskLevel: RiskLevel): string[] {
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

export function detectGhostCommitsFromDiff(
  diff: string,
): Array<{ sha: string; message: string; detected: boolean; reason?: string }> {
  const results: Array<{
    sha: string;
    message: string;
    detected: boolean;
    reason?: string;
  }> = [];

  const commitPattern = /^From ([a-f0-9]+) .*$/gm;
  let match: RegExpExecArray | null = commitPattern.exec(diff);

  while (match !== null) {
    const capturedSha = match[1];
    const sha = typeof capturedSha === "string" ? capturedSha : "";
    results.push({
      sha,
      message: "",
      detected: false,
    });
    match = commitPattern.exec(diff);
  }

  return results;
}
