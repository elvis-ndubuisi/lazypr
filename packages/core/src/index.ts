import { z } from "zod";

export const PRMetadataSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pullNumber: z.number(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
});

export type PRMetadata = z.infer<typeof PRMetadataSchema>;

export const CommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
});

export type Commit = z.infer<typeof CommitSchema>;

export const GhostCommitResultSchema = z.object({
  sha: z.string(),
  message: z.string(),
  detected: z.boolean(),
  reason: z.string().optional(),
});

export type GhostCommitResult = z.infer<typeof GhostCommitResultSchema>;

export const GitDiffOptionsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  baseSha: z.string(),
  headSha: z.string(),
  token: z.string().optional(),
});

export type GitDiffOptions = z.infer<typeof GitDiffOptionsSchema>;

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

export class GhostCommitDetector {
  private readonly sensitivityThreshold: number;

  constructor(options?: { sensitivityThreshold?: number }) {
    this.sensitivityThreshold = options?.sensitivityThreshold ?? 0.3;
  }

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

  private extractCommitDiff(_diff: string, _sha: string): string {
    return "";
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
    _commitDiff: string,
    _keywords: string[],
  ): { detected: boolean; reason?: string } {
    return { detected: false };
  }
}
