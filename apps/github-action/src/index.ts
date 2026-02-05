import * as core from "@actions/core";
import * as github from "@actions/github";
import { type RiskLevel, generatePRSummar } from "@lazypr/ai-engine";
import { getTemplate } from "@lazypr/config-presets";
import {
  DiffSanitizer,
  GhostCommitDetector,
  PRTitleEnhancer,
  TokenManager,
  assessPRSize,
  detectTicketsFromSources,
  formatTicketsMarkdown,
  generateSizeBlockMessage,
  generateSizeWarning,
  getGitDiff,
} from "@lazypr/core";
import { ensureLabelsExist, getRiskLabelEmoji, updateRiskLabels } from "./label-manager.js";
import type { OctokitClient } from "./octokit-types.js";
import { formatChecklistForMarkdown, updatePRDescription, updatePRTitle } from "./pr-updater.js";
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
  provider: "openai" | "anthropic" | "gemini";
  /** Template name to use ("default", "security", "concise", "verbose") */
  template: string;
  /** GitHub API token for authenticated requests */
  githubToken: string;
  /** Whether to enable loading custom templates from the repository */
  customTemplateEnabled: boolean;
  /** Optional explicit repository path for the custom template */
  customTemplatePath?: string;
  /** Custom regex pattern for ticket ID detection */
  ticketPattern?: string;
  /** URL template for ticket links (use {{id}} placeholder) */
  ticketUrlTemplate?: string;
  /** Whether to auto-update vague PR titles */
  autoUpdateTitle: boolean;
  /** Custom placeholders to substitute in templates */
  customPlaceholders?: Record<string, string>;
  /** PR size warning threshold (lines) */
  prSizeWarning: number;
  /** PR size block threshold (lines) */
  prSizeBlock: number;
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
  /** Commit messages for ticket detection */
  commits: string[];
}

/**
 * Reads and validates action inputs from GitHub Actions workflow.
 *
 * @returns Inputs object with all required action configuration
 * @throws Error if required inputs are missing
 */
function getInputs(): Inputs {
  const providerInput = core.getInput("provider");
  const provider = (providerInput as "openai" | "anthropic" | "gemini") || "openai";
  const modelInput = core.getInput("model");

  let defaultModel = "gpt-4-turbo";
  if (provider === "gemini") {
    defaultModel = "gemini-2.5-flash";
  } else if (provider === "anthropic") {
    defaultModel = "claude-sonnet-4-20250514";
  }

  const model = modelInput && modelInput.trim().length > 0 ? modelInput.trim() : defaultModel;

  // Parse custom placeholders
  let customPlaceholders: Record<string, string> | undefined;
  const customPlaceholdersInput = core.getInput("custom_placeholders");
  if (customPlaceholdersInput && customPlaceholdersInput.trim().length > 0) {
    try {
      const parsed = JSON.parse(customPlaceholdersInput);
      // Validate that it's an object with string values
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        customPlaceholders = parsed as Record<string, string>;
      } else {
        core.warning("custom_placeholders must be a JSON object with string values");
      }
    } catch (error) {
      core.warning(`Failed to parse custom_placeholders: ${error}`);
    }
  }

  // Parse PR size thresholds
  const prSizeWarning = Number.parseInt(core.getInput("pr_size_warning") || "500", 10);
  const prSizeBlock = Number.parseInt(core.getInput("pr_size_block") || "2000", 10);

  return {
    apiKey: core.getInput("api_key", { required: true }),
    model,
    provider,
    template: core.getInput("template") || "default",
    githubToken: core.getInput("github_token") || process.env.GITHUB_TOKEN || "",
    customTemplateEnabled: core.getInput("custom_template") !== "false",
    customTemplatePath: core.getInput("custom_template_path") || undefined,
    ticketPattern: core.getInput("ticket_pattern") || undefined,
    ticketUrlTemplate: core.getInput("ticket_url_template") || undefined,
    autoUpdateTitle: core.getInput("auto_update_title") === "true",
    customPlaceholders,
    prSizeWarning,
    prSizeBlock,
  };
}

/**
 * Extracts PR context from the GitHub Actions event payload.
 *
 * @returns PRContext with repository and PR details
 * @throws Error if not running on a pull request event
 */
async function getPRContext(octokit: OctokitClient): Promise<PRContext> {
  const { owner, repo } = github.context.repo;
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    throw new Error("This action must be run on a pull request event");
  }

  // Fetch commit messages for ticket detection
  const commits = await listPullRequestCommits(octokit, {
    owner,
    repo,
    pullNumber: pullRequest.number,
    baseSha: pullRequest.base?.sha || github.context.sha,
    headSha: pullRequest.head?.sha || github.context.sha,
    title: pullRequest.title || "",
    body: pullRequest.body || "",
    author: pullRequest.user?.login || "unknown",
    commits: [], // Will be filled below
  });

  const commitMessages = commits.map((c) => c.message);

  return {
    owner,
    repo,
    pullNumber: pullRequest.number,
    baseSha: pullRequest.base?.sha || github.context.sha,
    headSha: pullRequest.head?.sha || github.context.sha,
    title: pullRequest.title || "",
    body: pullRequest.body || "",
    author: pullRequest.user?.login || "unknown",
    commits: commitMessages,
  };
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
    const octokit = github.getOctokit(inputs.githubToken);
    const prContext = await getPRContext(octokit);

    core.info(
      `Processing PR #${String(prContext.pullNumber)} in ${prContext.owner}/${prContext.repo}`,
    );

    await ensureLabelsExist(octokit, prContext.owner, prContext.repo);

    core.info("Fetching PR diff...");

    const diff = await getGitDiff({
      owner: prContext.owner,
      repo: prContext.repo,
      baseSha: prContext.baseSha,
      headSha: prContext.headSha,
      token: inputs.githubToken,
    });

    // Assess PR size and trigger warnings/blocks if configured
    let sizeWarningTriggered = false;
    const sizeBlocked = false;
    const sizeResult = assessPRSize(diff, inputs.prSizeWarning, inputs.prSizeBlock);

    core.info(
      `PR size: ${sizeResult.metrics.totalLines} lines (${sizeResult.metrics.additions} additions, ${sizeResult.metrics.deletions} deletions)`,
    );

    if (sizeResult.shouldBlock) {
      const blockMessage = generateSizeBlockMessage(sizeResult.metrics, sizeResult.blockThreshold);
      core.warning(blockMessage);
      core.setOutput("summary", blockMessage);
      core.setOutput("has_ghost_commits", "false");
      core.setOutput("pr_size_lines", String(sizeResult.metrics.totalLines));
      core.setOutput("pr_size_warning_triggered", "false");
      core.setOutput("pr_size_blocked", "true");
      return;
    }

    if (sizeResult.warningTriggered) {
      const warningMessage = generateSizeWarning(sizeResult.metrics, sizeResult.warningThreshold);
      core.warning(warningMessage);
      sizeWarningTriggered = true;
    }

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
      const customTemplate = await loadCustomTemplate(
        octokit,
        prContext.owner,
        prContext.repo,
        inputs.customTemplatePath,
      );

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

    // Detect related tickets from PR title, body, and commits
    core.info("Detecting related tickets...");
    const tickets = detectTicketsFromSources(
      {
        title: prContext.title,
        body: prContext.body,
        commits: prContext.commits,
      },
      {
        pattern: inputs.ticketPattern,
        urlTemplate: inputs.ticketUrlTemplate,
      },
    );
    const relatedTickets = formatTicketsMarkdown(tickets);
    core.info(`Found ${tickets.length} related ticket(s)`);

    // PR Title enhancement
    let enhancedTitle = "";

    if (inputs.autoUpdateTitle) {
      core.info("Analyzing PR title for vagueness...");
      const titleEnhancer = new PRTitleEnhancer();
      const titleResult = titleEnhancer.analyze(prContext.title, processedDiff, changedFiles);

      if (titleResult.isVague && titleResult.suggestedTitle) {
        core.info(`Title is vague (score: ${titleResult.score}%). Reason: ${titleResult.reason}`);
        enhancedTitle = titleResult.suggestedTitle;

        // Update the PR title
        try {
          await updatePRTitle(octokit, prContext, enhancedTitle);
          core.info(`✓ PR title updated: "${prContext.title}" -> "${enhancedTitle}"`);
        } catch (error) {
          core.warning(`Failed to update PR title: ${error}`);
        }
      } else {
        core.info(`Title is descriptive enough (score: ${titleResult.score}%)`);
      }
    }

    // Add related tickets placeholder to template
    if (templateContent) {
      templateContent = templateContent.replace(/\{\{relatedTickets\}\}/g, relatedTickets);
    }

    // Substitute PR size placeholders
    if (templateContent) {
      templateContent = templateContent.replace(
        /\{\{prSizeLines\}\}/g,
        String(sizeResult.metrics.totalLines),
      );
      templateContent = templateContent.replace(
        /\{\{prSizeFiles\}\}/g,
        String(sizeResult.metrics.filesChanged),
      );
      templateContent = templateContent.replace(
        /\{\{prSizeAdditions\}\}/g,
        String(sizeResult.metrics.additions),
      );
      templateContent = templateContent.replace(
        /\{\{prSizeDeletions\}\}/g,
        String(sizeResult.metrics.deletions),
      );
      templateContent = templateContent.replace(
        /\{\{prSizeMetrics\}\}/g,
        JSON.stringify(sizeResult.metrics, null, 2),
      );
      core.info("PR size placeholders substituted");
    }

    // Substitute custom placeholders
    let customPlaceholdersApplied = 0;
    if (templateContent && inputs.customPlaceholders) {
      core.info("Substituting custom placeholders...");
      for (const [placeholder, value] of Object.entries(inputs.customPlaceholders)) {
        // Validate placeholder format (must be {{name}})
        if (/^\{\{[a-zA-Z0-9_]+\}\}$/.test(placeholder)) {
          const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          if (templateContent.includes(placeholder)) {
            templateContent = templateContent.replace(regex, String(value));
            customPlaceholdersApplied++;
            core.info(`Substituted ${placeholder} -> ${value}`);
          }
        } else {
          core.warning(`Invalid placeholder format: ${placeholder}. Must match {{name}} pattern.`);
        }
      }
      core.info(`Applied ${customPlaceholdersApplied} custom placeholder(s)`);
    }

    core.info("Generating PR summary with AI...");

    const result = await generatePRSummar(processedDiff, changedFiles, {
      apiKey: inputs.apiKey,
      provider: inputs.provider,
      model: inputs.model,
      customTemplate: templateContent,
      systemPrompt,
      prTitle: prContext.title,
      prBody: prContext.body,
      prAuthor: prContext.author,
    });

    core.info(`Summary generated. Risk level: ${result.riskLevel}`);

    const ghostCommitResults = await detectGhostCommits(octokit, prContext);

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
    core.setOutput("related_tickets", relatedTickets);
    core.setOutput("enhanced_title", enhancedTitle);
    core.setOutput("custom_placeholders_applied", String(customPlaceholdersApplied));
    core.setOutput("pr_size_lines", String(sizeResult.metrics.totalLines));
    core.setOutput("pr_size_warning_triggered", String(sizeWarningTriggered));
    core.setOutput("pr_size_blocked", String(sizeBlocked));

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
  octokit: OctokitClient,
  prContext: PRContext,
): Promise<Array<{ sha: string; message: string; detected: boolean; reason?: string }>> {
  try {
    const detector = new GhostCommitDetector();

    const commits = await listPullRequestCommits(octokit, prContext);
    const commitsToAnalyze = commits.slice(-MAX_GHOST_COMMITS_TO_ANALYZE);

    const commitsWithDiff: Array<{ sha: string; message: string; diff: string }> = [];

    for (const commit of commitsToAnalyze) {
      const commitDiff = await fetchCommitDiff(
        octokit,
        prContext.owner,
        prContext.repo,
        commit.sha,
      );
      if (!commitDiff) {
        continue;
      }
      commitsWithDiff.push({
        sha: commit.sha,
        message: commit.message,
        diff: commitDiff,
      });
    }

    const results = await detector.detectFromCommitDiffs(commitsWithDiff);

    return results;
  } catch (error) {
    core.warning(`Failed to detect ghost commits: ${error}`);
    return [];
  }
}

const MAX_GHOST_COMMITS_TO_ANALYZE = 20;

async function listPullRequestCommits(
  octokit: OctokitClient,
  prContext: PRContext,
): Promise<Array<{ sha: string; message: string }>> {
  const response = await octokit.rest.pulls.listCommits({
    owner: prContext.owner,
    repo: prContext.repo,
    pull_number: prContext.pullNumber,
    per_page: 100,
  });

  return response.data
    .map((c) => ({
      sha: c.sha,
      // Prefer the first line (subject) for keyword extraction.
      message: (c.commit?.message ?? "").split("\n")[0] ?? "",
    }))
    .filter((c) => c.sha.length > 0);
}

async function fetchCommitDiff(
  octokit: OctokitClient,
  owner: string,
  repo: string,
  sha: string,
): Promise<string | null> {
  try {
    const response = await octokit.request<string>("GET /repos/{owner}/{repo}/commits/{ref}", {
      owner,
      repo,
      ref: sha,
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
    });

    const data = response.data;
    return typeof data === "string" ? data : null;
  } catch (error) {
    core.warning(`Failed to fetch commit diff for ${sha.substring(0, 7)}: ${error}`);
    return null;
  }
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
