import { z } from "zod";

/**
 * Schema for validating GitHub Pull Request metadata returned from the API.
 */
export const PRMetadataSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pullNumber: z.number(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
});

/**
 * Represents metadata about a GitHub Pull Request.
 */
export type PRMetadata = z.infer<typeof PRMetadataSchema>;

/**
 * Schema for validating individual commit information.
 */
export const CommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
});

/**
 * Represents a Git commit with its SHA hash and commit message.
 */
export type Commit = z.infer<typeof CommitSchema>;

/**
 * Schema for validating ghost commit detection results.
 */
export const GhostCommitResultSchema = z.object({
  sha: z.string(),
  message: z.string(),
  detected: z.boolean(),
  reason: z.string().optional(),
});

/**
 * Represents the result of a ghost commit detection analysis.
 */
export type GhostCommitResult = z.infer<typeof GhostCommitResultSchema>;

/**
 * Schema for validating options required to fetch a git diff.
 */
export const GitDiffOptionsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  baseSha: z.string(),
  headSha: z.string(),
  token: z.string().optional(),
});

/**
 * Options required to fetch a git diff between two commits.
 */
export type GitDiffOptions = z.infer<typeof GitDiffOptionsSchema>;

/**
 * Fetches the git diff between two commits from GitHub's compare API.
 *
 * @param options - The options containing repository details and commit SHAs
 * @returns A promise that resolves to the raw git diff as a string
 * @throws Error if the GitHub API request fails
 *
 * @example
 * ```typescript
 * const diff = await getGitDiff({
 *   owner: "facebook",
 *   repo: "react",
 *   baseSha: "main",
 *   headSha: "feature-branch"
 * });
 * ```
 */
export async function getGitDiff(options: GitDiffOptions): Promise<string> {
  const { owner, repo, baseSha, headSha, token } = GitDiffOptionsSchema.parse(options);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.diff",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`,
    {
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const diff = await response.text();
  return diff;
}

/**
 * Fetches metadata about a specific Pull Request from GitHub.
 *
 * @param owner - The repository owner (username or organization)
 * @param repo - The repository name
 * @param pullNumber - The PR number
 * @param token - Optional GitHub API token for authenticated requests
 * @returns A promise that resolves to the PR metadata
 * @throws Error if the GitHub API request fails or the PR is not found
 *
 * @example
 * ```typescript
 * const metadata = await getPRMetadata("facebook", "react", 123);
 * console.log(metadata.title);
 * ```
 */
export async function getPRMetadata(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string,
): Promise<PRMetadata> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const prData = PRApiResponseSchema.parse(data);

  return {
    owner,
    repo,
    pullNumber,
    title: prData.title,
    body: prData.body,
    author: prData.user.login,
  };
}

const PRApiResponseSchema = z.object({
  title: z.string(),
  body: z.string(),
  user: z.object({
    login: z.string(),
  }),
});

/**
 * Sanitizes a git diff by replacing sensitive or verbose patterns with generic placeholders.
 *
 * This function removes specific file paths, line numbers, and git metadata
 * while preserving the code structure. Useful for preparing diffs for LLMs.
 *
 * @param diff - The raw git diff string to sanitize
 * @returns The sanitized diff with paths and metadata replaced by placeholders
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeDiff("diff --git a/src/auth.ts b/src/auth.ts");
 * // Result: "diff --git a/... b/..."
 * ```
 */
export function sanitizeDiff(diff: string): string {
  let sanitized = diff;

  const patterns: Array<[RegExp, string]> = [
    [/\+\+\+ b\/.*/, "+++ b/..."],
    [/--- a\/.*/, "--- a/..."],
    [/@@ -\d+,\d+ \+(\d+),(\d+) @@/, "@@ ... @@"],
    [/diff --git a\/.* b\/.*/, "diff --git a/... b/..."],
    [/index [a-f0-9]+\.\.[a-f0-9]+ \d{3,4}/, "index ... ..."],
  ];

  for (const [pattern, replacement] of patterns) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Extracts a list of changed file paths from a git diff.
 *
 * Parses the diff looking for "+++ b/" lines to identify which files were modified.
 *
 * @param diff - The git diff string to parse
 * @returns An array of unique file paths that were changed (deduplicated)
 *
 * @example
 * ```typescript
 * const files = extractChangedFiles("+++ b/src/auth.ts\n--- a/src/auth.ts");
 * // Result: ["src/auth.ts"]
 * ```
 */
export function extractChangedFiles(diff: string): string[] {
  const filePattern = /^\+\+\+ b\/(.+)$/gm;
  const files: string[] = [];
  let match: RegExpExecArray | null = filePattern.exec(diff);

  while (match !== null) {
    const captured = match[1];
    const file = typeof captured === "string" ? captured : "";
    files.push(file);
    match = filePattern.exec(diff);
  }

  return [...new Set(files)];
}

/**
 * Extracts commit information from a git diff.
 *
 * Parses the diff looking for "From [sha]" commit markers to identify
 * which commits are included in the diff.
 *
 * @param diff - The git diff string to parse
 * @returns An array of commit objects with SHA and message properties
 */
export function extractCommitsFromDiff(diff: string): Array<{ sha: string; message: string }> {
  const commits: Array<{ sha: string; message: string }> = [];

  for (const line of diff.split("\n")) {
    const matchResult = line.match(/^From ([a-f0-9]+) .*$/);
    if (matchResult !== null && matchResult.length >= 2) {
      const sha: string = (matchResult[1] as string) || "";
      commits.push({
        sha,
        message: "",
      });
    }
  }

  return commits;
}

/**
 * Detects "ghost commits" - commits where the commit message doesn't match the actual code changes.
 *
 * A ghost commit is detected when the keywords in the commit message don't appear
 * in the diff of that commit. This helps identify misleading commit messages.
 *
 * @example
 * ```typescript
 * const detector = new GhostCommitDetector();
 * const results = await detector.detect(diff, commits);
 * results.forEach(r => {
 *   if (r.detected) {
 *     console.log(`Ghost commit: ${r.sha} - ${r.reason}`);
 *   }
 * });
 * ```
 */
export class GhostCommitDetector {
  private readonly sensitivityThreshold: number;

  /**
   * Creates a new GhostCommitDetector instance.
   *
   * @param options - Configuration options
   * @param options.sensitivityThreshold - Threshold for mismatch detection (0-1, default 0.3)
   */
  constructor(options?: { sensitivityThreshold?: number }) {
    this.sensitivityThreshold = options?.sensitivityThreshold ?? 0.3;
  }

  /**
   * Analyzes commits to detect if their messages match the actual code changes.
   *
   * @param diff - The complete git diff containing all changes
   * @param commits - Array of commits with SHA and message to analyze
   * @returns Promise resolving to an array of detection results
   */
  async detect(
    diff: string,
    commits: Array<{ sha: string; message: string }>,
  ): Promise<GhostCommitResult[]> {
    const results: GhostCommitResult[] = [];

    for (const commit of commits) {
      const commitDiff = this.extractCommitDiff(diff, commit.sha);
      const keywords = this.extractKeywords(commit.message);
      const hasMismatch = this.checkMismatch(commitDiff, keywords);

      results.push({
        sha: commit.sha,
        message: commit.message,
        detected: hasMismatch.detected,
        reason: hasMismatch.reason,
      });
    }

    return results;
  }

  /**
   * Detects ghost commits from per-commit diffs (recommended).
   *
   * @param commits - Commits with their individual diffs/patches
   */
  async detectFromCommitDiffs(
    commits: Array<{ sha: string; message: string; diff: string }>,
  ): Promise<GhostCommitResult[]> {
    const results: GhostCommitResult[] = [];

    for (const commit of commits) {
      const keywords = this.extractKeywords(commit.message);
      const hasMismatch = this.checkMismatch(commit.diff, keywords);

      results.push({
        sha: commit.sha,
        message: commit.message,
        detected: hasMismatch.detected,
        reason: hasMismatch.reason,
      });
    }

    return results;
  }

  private extractCommitDiff(diff: string, sha: string): string {
    // Best-effort extraction for diffs that include "From <sha>" markers
    // (e.g. `git format-patch`). If absent, fall back to the full diff.
    const marker = `From ${sha}`;
    const start = diff.indexOf(marker);
    if (start === -1) {
      return diff;
    }

    const next = diff.indexOf("\nFrom ", start + marker.length);
    if (next === -1) {
      return diff.substring(start);
    }

    return diff.substring(start, next);
  }

  private extractKeywords(message: string): string[] {
    const words = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const ignoreWords = new Set([
      "the",
      "and",
      "for",
      "this",
      "that",
      "with",
      "from",
      "have",
      "been",
      "were",
      "they",
      "their",
      "what",
      "when",
      "where",
      "which",
      "while",
      "there",
      "these",
      "those",
      "then",
      "just",
      "only",
      "also",
      "into",
      "some",
      "could",
      "would",
      "should",
      "could",
      "about",
      "after",
      "before",
      "between",
      "through",
      "during",
      "under",
      "again",
      "refactor",
      "update",
      "change",
      "modify",
      "remove",
      "delete",
      "add",
      "create",
      "fix",
      "bug",
      "error",
      "issue",
      "problem",
    ]);

    return words.filter((word) => !ignoreWords.has(word));
  }

  private checkMismatch(
    commitDiff: string,
    keywords: string[],
  ): { detected: boolean; reason?: string } {
    const trimmedDiff = commitDiff.trim();
    if (trimmedDiff.length === 0) {
      return { detected: false, reason: "No diff available for commit" };
    }

    if (keywords.length === 0) {
      return { detected: false };
    }

    const diffLower = trimmedDiff.toLowerCase();

    const matched: string[] = [];
    const missing: string[] = [];

    for (const keyword of keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(diffLower)) {
        matched.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    const matchRatio = matched.length / keywords.length;
    const detected = matchRatio < this.sensitivityThreshold;

    if (!detected) {
      return { detected: false };
    }

    const missingSample = missing.slice(0, 8).join(", ");
    const reason = missing.length > 0 ? `Keywords not found in diff: ${missingSample}` : undefined;

    return { detected: true, reason };
  }
}

export { DiffSanitizer, type ParsedFile } from "./diff-sanitizer.js";
export { TokenManager, type TokenWeight, type TruncateOptions } from "./token-manager.js";
export {
  PRTitleEnhancer,
  analyzeTitle,
  type TitleEnhancementResult,
} from "./pr-title-enhancer.js";
export {
  detectTickets,
  detectTicketsFromSources,
  formatTicketsMarkdown,
  type TicketMatch,
  type TicketDetectionOptions,
} from "./ticket-detector.js";
export {
  calculatePRSize,
  assessPRSize,
  formatSizeMetricsMarkdown,
  generateSizeWarning,
  generateSizeBlockMessage,
  type PRSizeMetrics,
  type SizeAssessmentResult,
} from "./pr-size.js";
