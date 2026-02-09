/**
 * PR Size Detection - Calculate and assess PR size metrics
 *
 * Analyzes git diffs to determine PR size and trigger warnings
 * or blocks based on configurable thresholds.
 */

export interface PRSizeMetrics {
  /** Total number of files changed */
  filesChanged: number;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
  /** Total number of lines changed (additions + deletions) */
  totalLines: number;
  /** Number of files added */
  filesAdded: number;
  /** Number of files modified */
  filesModified: number;
  /** Number of files deleted */
  filesDeleted: number;
}

export interface SizeAssessmentResult {
  /** Whether PR size exceeds warning threshold */
  warningTriggered: boolean;
  /** Whether PR size exceeds block threshold */
  shouldBlock: boolean;
  /** PR size metrics */
  metrics: PRSizeMetrics;
  /** Warning threshold used */
  warningThreshold: number;
  /** Block threshold used */
  blockThreshold: number;
}

/**
 * Calculates PR size metrics from a git diff
 *
 * @param diff - The git diff string
 * @returns PR size metrics
 *
 * @example
 * ```typescript
 * const metrics = calculatePRSize(`diff --git a/file.ts b/file.ts
 * +++ b/file.ts
 * @@ -1,5 +1,10 @@
 * +new line 1
 * +new line 2`);
 * // Returns: { filesChanged: 1, additions: 2, deletions: 0, totalLines: 2, ... }
 * ```
 */
export function calculatePRSize(diff: string): PRSizeMetrics {
  const metrics: PRSizeMetrics = {
    filesChanged: 0,
    additions: 0,
    deletions: 0,
    totalLines: 0,
    filesAdded: 0,
    filesModified: 0,
    filesDeleted: 0,
  };

  if (!diff || diff.trim().length === 0) {
    return metrics;
  }

  const lines = diff.split("\n");
  let inHunk = false;
  let currentFileAdded = false;
  let currentFileDeleted = false;
  let currentFileModified = false;

  for (const line of lines) {
    // Detect file changes
    if (line.startsWith("diff --git")) {
      // Reset for new file
      if (metrics.filesChanged > 0) {
        // Count previous file
        if (currentFileAdded) {
          metrics.filesAdded++;
        } else if (currentFileDeleted) {
          metrics.filesDeleted++;
        } else if (currentFileModified) {
          metrics.filesModified++;
        }
      }
      metrics.filesChanged++;
      inHunk = false;
      currentFileAdded = false;
      currentFileDeleted = false;
      currentFileModified = false;
    }

    // Detect new file
    if (line.startsWith("new file mode")) {
      currentFileAdded = true;
    }

    // Detect deleted file
    if (line.startsWith("deleted file mode")) {
      currentFileDeleted = true;
    }

    // Detect hunk start
    if (line.startsWith("@@")) {
      inHunk = true;
      if (!currentFileAdded && !currentFileDeleted) {
        currentFileModified = true;
      }
    }

    // Count additions and deletions
    if (inHunk && line.length > 0) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        metrics.additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        metrics.deletions++;
      }
    }
  }

  // Count the last file
  if (currentFileAdded) {
    metrics.filesAdded++;
  } else if (currentFileDeleted) {
    metrics.filesDeleted++;
  } else if (currentFileModified) {
    metrics.filesModified++;
  }

  metrics.totalLines = metrics.additions + metrics.deletions;

  return metrics;
}

/**
 * Assesses PR size against thresholds
 *
 * @param diff - The git diff string
 * @param warningThreshold - Lines threshold for warning (0 to disable)
 * @param blockThreshold - Lines threshold for blocking (0 to disable)
 * @returns Assessment result with metrics and threshold info
 *
 * @example
 * ```typescript
 * const result = assessPRSize(diff, 500, 2000);
 * if (result.shouldBlock) {
 *   console.log("PR too large, skipping summarization");
 * }
 * ```
 */
export function assessPRSize(
  diff: string,
  warningThreshold: number,
  blockThreshold: number,
): SizeAssessmentResult {
  const metrics = calculatePRSize(diff);

  const warningTriggered = warningThreshold > 0 && metrics.totalLines > warningThreshold;
  const shouldBlock = blockThreshold > 0 && metrics.totalLines > blockThreshold;

  return {
    warningTriggered,
    shouldBlock,
    metrics,
    warningThreshold,
    blockThreshold,
  };
}

/**
 * Formats PR size metrics as a markdown string
 *
 * @param metrics - PR size metrics
 * @returns Markdown formatted string
 */
export function formatSizeMetricsMarkdown(metrics: PRSizeMetrics): string {
  return `${metrics.totalLines} lines changed (${metrics.additions} additions, ${metrics.deletions} deletions) across ${metrics.filesChanged} files`;
}

/**
 * Generates a size warning message
 *
 * @param metrics - PR size metrics
 * @param threshold - The threshold that was exceeded
 * @returns Warning message
 */
export function generateSizeWarning(metrics: PRSizeMetrics, threshold: number): string {
  const percentage = Math.round((metrics.totalLines / threshold) * 100);
  return `⚠️ PR Size Warning: ${formatSizeMetricsMarkdown(metrics)} (exceeds ${threshold} line threshold by ${percentage - 100}%)`;
}

/**
 * Generates a size block message
 *
 * @param metrics - PR size metrics
 * @param threshold - The threshold that was exceeded
 * @returns Block message
 */
export function generateSizeBlockMessage(metrics: PRSizeMetrics, threshold: number): string {
  return `🚫 PR too large: ${formatSizeMetricsMarkdown(metrics)}. Exceeds maximum ${threshold} lines. Consider splitting into smaller PRs.`;
}
