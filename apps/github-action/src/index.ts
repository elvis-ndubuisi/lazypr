import * as core from "@actions/core";
import * as github from "@actions/github";
import { type RiskLevel, createLangChainProvider, generatePRSummar } from "@lazypr/ai-engine";
import { getTemplate } from "@lazypr/config-presets";
import {
  DiffSanitizer,
  GhostCommitDetector,
  type ParsedFile,
  TokenManager,
  extractChangedFiles,
  getGitDiff,
  getPRMetadata,
} from "@lazypr/core";
import { Octokit } from "@octokit/rest";
import { ensureLabelsExist, getRiskLabelEmoji, updateRiskLabels } from "./label-manager.js";
import { formatChecklistForMarkdown, getCurrentPRBody, updatePRDescription } from "./pr-updater.js";
import { loadCustomTemplate, sanitizeTemplate, validateTemplate } from "./template-loader.js";

/**
 * Input configuration for the lazypr GitHub Action.
 */
interface Inputs {
  /** API key for the LLM provider (OpenAI, Anthropic, or Gemini) */
  apiKey: string;
  /** LLM model to use (e.g., "gpt-4-turbo", "gemini-2.5-flash") */
  model: string;
  /** LLM provider to use ("openai", "anthropic", or "gemini") */
  provider: "openai" | "anthropic";
  /** Template name to use ("default", "security", "concise", "verbose") */
  template: string;
  /** GitHub API token for authenticated requests */
  githubToken: string;
  /** Whether to enable loading custom templates from the repository */
  customTemplateEnabled: boolean;
}

/**
 * Context information about the current Pull Request.
 */
interface PRContext {
  /** Repository owner (username or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** PR number */
  pullNumber: number;
  /** SHA of the base branch */
  baseSha: string;
  /** SHA of the head branch */
  headSha: string;
  /** PR title */
  title: string;
  /** PR body/description */
  body: string;
  /** PR author's username */
  author: string;
}

/**
 * Reads and validates action inputs from GitHub Actions workflow.
 *
 * @returns Inputs object with all required action configuration
 * @throws Error if required inputs are missing
 */
function getInputs(): Inputs {
  return {
    apiKey: core.getInput("api_key", { required: true }),
    model: core.getInput("model") || "gpt-4-turbo",
    provider: (core.getInput("provider") as "openai" | "anthropic") || "openai",
    template: core.getInput("template") || "default",
    githubToken: core.getInput("github_token") || process.env.GITHUB_TOKEN || "",
    customTemplateEnabled: core.getInput("custom_template") !== "false",
  };
}

/**
 * Extracts PR context from the GitHub Actions event payload.
 *
 * @returns PRContext with repository and PR details
 * @throws Error if not running on a pull request event
 */
function getPRContext(): PRContext {
  const { owner, repo } = github.context.repo;
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    throw new Error("This action must be run on a pull request event");
  }

  return {
    owner,
    repo,
    pullNumber: pullRequest.number,
    baseSha: pullRequest.base?.sha || github.context.sha,
    headSha: pullRequest.head?.sha || github.context.sha,
    title: pullRequest.title || "",
    body: pullRequest.body || "",
    author: pullRequest.user?.login || "unknown",
  };
}

/**
 * Creates an LLM provider based on the configured provider type.
 *
 * @param inputs - The action inputs containing provider configuration
 * @returns Configured LLMProvider instance
 */
function _createProvider(inputs: Inputs): ReturnType<typeof createLangChainProvider> {
  return createLangChainProvider({
    provider: inputs.provider === "anthropic" ? "anthropic" : "openai",
    apiKey: inputs.apiKey,
    model: inputs.model,
  });
}

/**
 * Returns the maximum token limit for the specified provider.
 *
 * Different LLM providers have different context window sizes:
 * - Gemini 2.5 Flash: 1M tokens
 * - OpenAI GPT-4 Turbo: 128K tokens
 * - Anthropic Claude: 200K tokens
 */
function getMaxTokensForProvider(provider: string): number {
  switch (provider) {
    case "gemini":
      return 800000;
    case "anthropic":
      return 150000;
    default:
      return 100000;
  }
}

/**
 * Main execution function for the lazypr GitHub Action.
 *
 * This function orchestrates the entire PR summary generation workflow:
 * 1. Reads action inputs and PR context
 * 2. Fetches the git diff from GitHub
 * 3. Generates a summary using the configured LLM provider
 * 4. Detects ghost commits
 * 5. Updates the PR description with the summary and risk labels
 *
 * @returns Promise that resolves when the action completes
 */
async function run(): Promise<void> {
  const startTime = Date.now();

  try {
    core.info("Starting lazypr PR Summary generation...");

    const inputs = getInputs();
    const prContext = getPRContext();

    core.info(
      `Processing PR #${String(prContext.pullNumber)} in ${prContext.owner}/${prContext.repo}`,
    );

    const octokit = new Octokit({ auth: inputs.githubToken });

    await ensureLabelsExist(octokit, prContext.owner, prContext.repo);

    core.info("Fetching PR diff...");

    const diff = await getGitDiff({
      owner: prContext.owner,
      repo: prContext.repo,
      baseSha: prContext.baseSha,
      headSha: prContext.headSha,
      token: inputs.githubToken,
    });

    if (!diff || diff.trim().length === 0) {
      core.warning("No diff found for this PR");
      core.setOutput("summary", "No changes detected");
      core.setOutput("has_ghost_commits", "false");
      return;
    }

    core.info("Changed files detected, processing diff...");

    let templateContent: string | undefined;
    let systemPrompt: string | undefined;

    if (inputs.customTemplateEnabled) {
      core.info("Checking for custom template...");
      const customTemplate = await loadCustomTemplate(octokit, prContext.owner, prContext.repo);

      if (customTemplate) {
        const validation = validateTemplate(customTemplate);
        if (validation.valid) {
          core.info("Using custom template from repository");
          templateContent = sanitizeTemplate(customTemplate);
        } else {
          core.warning(`Custom template is invalid: ${validation.errors.join(", ")}`);
        }
      }
    }

    if (!templateContent) {
      const template = getTemplate(inputs.template);
      templateContent = template.template;
      systemPrompt = template.systemPrompt;
      core.info(`Using built-in template: ${template.name}`);
    }

    core.info("Sanitizing and processing diff...");

    const sanitizer = new DiffSanitizer();
    const parsedFiles = sanitizer.parse(diff);
    const sanitizedFiles = sanitizer.sanitize(parsedFiles, {
      excludeLockfiles: true,
      excludeNonCodeAssets: true,
    });

    const tokenManager = new TokenManager();
    const maxTokens = getMaxTokensForProvider(inputs.provider);
    const truncatedFiles = tokenManager.truncate(sanitizedFiles, {
      maxTokens,
    });

    const processedDiff = sanitizer.reconstruct(truncatedFiles);
    const changedFiles = truncatedFiles.map((f) => f.newPath);

    core.info(
      `Processed ${truncatedFiles.length}/${parsedFiles.length} files (${tokenManager.getTotalTokens(truncatedFiles)} tokens)`,
    );

    core.info("Generating PR summary with AI...");

    const result = await generatePRSummar(processedDiff, changedFiles, {
      apiKey: inputs.apiKey,
      provider: inputs.provider,
      model: inputs.model,
      customTemplate: templateContent,
      systemPrompt,
    });

    core.info(`Summary generated. Risk level: ${result.riskLevel}`);

    const ghostCommitResults = await detectGhostCommits(diff, inputs.githubToken, prContext);

    const hasGhostCommits = ghostCommitResults.some((r) => r.detected);

    core.info("Updating PR description...");

    await updatePRDescription(octokit, {
      owner: prContext.owner,
      repo: prContext.repo,
      pullNumber: prContext.pullNumber,
      summary: result.summary,
      existingBody: prContext.body,
      riskLevel: result.riskLevel,
      impactScore: result.impactScore,
      checklist: result.checklist,
      ghostCommits: ghostCommitResults,
      prTitle: prContext.title,
      prAuthor: prContext.author,
    });

    core.info("Updating risk labels...");

    await updateRiskLabels(octokit, {
      owner: prContext.owner,
      repo: prContext.repo,
      pullNumber: prContext.pullNumber,
      riskLevel: result.riskLevel as RiskLevel,
    });

    const output = formatOutput(result, ghostCommitResults, hasGhostCommits);

    core.setOutput("summary", output);
    core.setOutput("has_ghost_commits", String(hasGhostCommits));
    core.setOutput("risk_level", result.riskLevel);
    core.setOutput("impact_score", String(result.impactScore));

    if (hasGhostCommits) {
      const ghostWarnings = ghostCommitResults
        .filter((r) => r.detected)
        .map((r) => {
          const sha = r.sha.substring(0, 7);
          return `  - ${sha}: ${r.reason || "Message mismatch"}`;
        })
        .join("\n");
      core.warning(`Potential ghost commits detected:\n${ghostWarnings}`);
    }

    const duration = Date.now() - startTime;
    core.info(`lazypr PR Summary generation complete! (took ${String(duration)}ms)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Error generating PR summary: ${errorMessage}`);
  }
}

/**
 * Detects ghost commits in the PR diff.
 *
 * Ghost commits are commits where the message doesn't match the actual code changes.
 *
 * @param diff - The git diff to analyze
 * @param token - GitHub API token
 * @param prContext - PR context information
 * @returns Array of ghost commit detection results
 */
async function detectGhostCommits(
  diff: string,
  token: string,
  prContext: PRContext,
): Promise<Array<{ sha: string; message: string; detected: boolean; reason?: string }>> {
  try {
    const detector = new GhostCommitDetector();

    const commits = extractCommitsFromGitHub(prContext, token);

    const results = await detector.detect(diff, commits);

    return results;
  } catch (error) {
    core.warning(`Failed to detect ghost commits: ${error}`);
    return [];
  }
}

/**
 * Extracts commit information from the GitHub PR payload.
 *
 * @param prContext - PR context information
 * @param _token - GitHub API token (currently unused)
 * @returns Array of commits with SHA and message
 */
function extractCommitsFromGitHub(
  _prContext: PRContext,
  _token: string,
): Array<{ sha: string; message: string }> {
  const commits: Array<{ sha: string; message: string }> = [];

  const pr = github.context.payload.pull_request;

  if (pr && typeof pr.commits === "number") {
    for (let i = 0; i < Math.min(pr.commits, 100); i++) {
      commits.push({
        sha: `commit-${String(i)}`,
        message: "Commit extraction requires GitHub API",
      });
    }
  }

  return commits;
}

/**
 * Formats the PR summary output with risk level, checklist, and ghost commit info.
 *
 * @param result - The summary generation result
 * @param ghostCommits - Array of ghost commit detection results
 * @param _hasGhostCommits - Whether any ghost commits were detected
 * @returns Formatted markdown output for the PR comment
 */
function formatOutput(
  result: { summary: string; riskLevel: string; impactScore: number; checklist: string[] },
  ghostCommits: Array<{ sha: string; message: string; detected: boolean; reason?: string }>,
  _hasGhostCommits: boolean,
): string {
  let output = result.summary;

  const riskEmoji = getRiskLabelEmoji(result.riskLevel as RiskLevel);
  output += `\n\n**Risk Level:** ${riskEmoji} ${result.riskLevel} (${String(result.impactScore)}/100)`;

  if (result.checklist && result.checklist.length > 0) {
    output += `\n\n${formatChecklistForMarkdown(result.checklist)}`;
  }

  const detectedGhostCommits = ghostCommits.filter((c) => c.detected);
  if (detectedGhostCommits.length > 0) {
    output += "\n\n### Potential Ghost Commits\n";
    for (const commit of detectedGhostCommits) {
      const sha = commit.sha.substring(0, 7);
      output += `- **${sha}**: ${commit.reason || "Message mismatch"}\n`;
    }
  }

  return output;
}

run().catch((error) => {
  core.setFailed(`Unhandled error ${error instanceof Error ? error.message : String(error)}`);
});
