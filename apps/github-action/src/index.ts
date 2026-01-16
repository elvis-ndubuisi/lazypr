import * as core from "@actions/core";
import * as github from "@actions/github";
import { type LLMProvider, createAnthropicProvider, createOpenAIProvider } from "@lazypr/ai-engine";
import { type PromptTemplate, getTemplate } from "@lazypr/config-presets";
import {
  GhostCommitDetector,
  extractChangedFiles,
  getGitDiff,
  getPRMetadata,
  sanitizeDiff,
} from "@lazypr/core";

interface Inputs {
  apiKey: string;
  model: string;
  provider: "openai" | "anthropic";
  template: string;
  githubToken: string;
}

function getInputs(): Inputs {
  return {
    apiKey: core.getInput("api_key", { required: true }),
    model: core.getInput("model") || "gpt-4-turbo",
    provider: (core.getInput("provider") as "openai" | "anthropic") || "openai",
    template: core.getInput("template") || "default",
    githubToken: core.getInput("github_token") || process.env.GITHUB_TOKEN || "",
  };
}

function createProvider(inputs: Inputs): LLMProvider {
  if (inputs.provider === "anthropic") {
    return createAnthropicProvider(inputs.apiKey);
  }
  return createOpenAIProvider(inputs.apiKey);
}

async function generatePRSummary(
  inputs: Inputs,
  diff: string,
  prMetadata: Awaited<ReturnType<typeof getPRMetadata>>,
): Promise<string> {
  const provider = createProvider(inputs);
  const template = getTemplate(inputs.template);

  const sanitizedDiff = sanitizeDiff(diff);
  const changedFiles = extractChangedFiles(diff);

  const systemPrompt = template.systemPrompt ?? undefined;
  const userPrompt = buildPrompt(template, {
    prTitle: prMetadata.title,
    prBody: prMetadata.body,
    prAuthor: prMetadata.author,
    filesChanged: changedFiles.join(", "),
    diff: sanitizedDiff,
  });

  const completion = await provider.complete(userPrompt, {
    model: inputs.model,
    maxTokens: 4000,
    temperature: 0.3,
    systemPrompt,
  });

  return completion.text;
}

interface PromptVariables {
  prTitle: string;
  prBody: string;
  prAuthor: string;
  filesChanged: string;
  diff: string;
}

function buildPrompt(template: PromptTemplate, variables: PromptVariables): string {
  let prompt = template.template;
  prompt = prompt.replace(/\{\{prTitle\}\}/g, variables.prTitle);
  prompt = prompt.replace(/\{\{prBody\}\}/g, variables.prBody || "(No description provided)");
  prompt = prompt.replace(/\{\{prAuthor\}\}/g, variables.prAuthor);
  prompt = prompt.replace(/\{\{filesChanged\}\}/g, variables.filesChanged);
  prompt = prompt.replace(/\{\{diff\}\}/g, variables.diff);
  return prompt;
}

async function runGhostCommitDetection(
  diff: string,
): Promise<Array<{ sha: string; message: string; detected: boolean; reason?: string }>> {
  const detector = new GhostCommitDetector();
  const commits = extractCommitInfoFromContext();
  const results = await detector.detect(diff, commits);
  return results;
}

function extractCommitInfoFromContext(): Array<{ sha: string; message: string }> {
  const commits: Array<{ sha: string; message: string }> = [];

  if (github.context.payload.pull_request?.commits) {
    for (let i = 0; i < github.context.payload.pull_request.commits; i++) {
      commits.push({
        sha: `commit-${i}`,
        message: "Commit message extraction requires GitHub API",
      });
    }
  }

  return commits;
}

async function main(): Promise<void> {
  try {
    core.info("Starting lazypr PR Summary generation...");

    const inputs = getInputs();
    const { owner, repo } = github.context.repo;
    const pullNumber = github.context.payload.pull_request?.number;

    if (!pullNumber) {
      core.setFailed("Could not determine pull request number");
      return;
    }

    core.info(`Processing PR #${pullNumber} in ${owner}/${repo}`);

    const prMetadata = await getPRMetadata(owner, repo, pullNumber, inputs.githubToken);
    core.info(`Fetched PR: "${prMetadata.title}" by ${prMetadata.author}`);

    const baseSha = github.context.payload.pull_request?.base?.sha || "main";
    const headSha = github.context.payload.pull_request?.head?.sha || "";

    core.info(`Fetching diff between ${baseSha}...${headSha}`);

    const diff = await getGitDiff({
      owner,
      repo,
      baseSha,
      headSha,
      token: inputs.githubToken,
    });

    if (!diff) {
      core.warning("No diff found for this PR");
      core.setOutput("summary", "No changes detected");
      return;
    }

    core.info("Generating PR summary with AI...");

    const summary = await generatePRSummary(inputs, diff, prMetadata);

    core.info("Checking for Ghost Commits...");

    const ghostCommitResults = await runGhostCommitDetection(diff);
    const hasGhostCommits = ghostCommitResults.some((r) => r.detected);

    const output = formatOutput(summary, ghostCommitResults, hasGhostCommits);

    core.setOutput("summary", output);
    core.setOutput("has_ghost_commits", String(hasGhostCommits));

    if (hasGhostCommits) {
      const ghostWarnings = ghostCommitResults
        .filter((r) => r.detected)
        .map((r) => `  - ${r.sha.substring(0, 7)}: ${r.reason}`)
        .join("\n");
      core.warning(`Potential ghost commits detected:\n${ghostWarnings}`);
    }

    core.info("lazypr PR Summary generation complete!");
  } catch (error) {
    core.setFailed(
      `Error generating PR summary: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function formatOutput(
  summary: string,
  ghostCommitResults: Array<{ sha: string; message: string; detected: boolean; reason?: string }>,
  _hasGhostCommits: boolean,
): string {
  let output = summary;

  const ghostCommits = ghostCommitResults.filter((r) => r.detected);
  if (ghostCommits.length > 0) {
    output += "\n\n### ⚠️ Potential Ghost Commits Detected\n";
    for (const commit of ghostCommits) {
      const sha = commit.sha.substring(0, 7);
      const reason = commit.reason || "Commit message may not match changes";
      output += `- **${sha}**: ${reason}\n`;
    }
  }

  return output;
}

main().catch((error) => {
  core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
