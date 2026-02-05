import { describe, expect, test } from "bun:test";
import {
  type PRSizeMetrics,
  assessPRSize,
  calculatePRSize,
  formatSizeMetricsMarkdown,
  generateSizeBlockMessage,
  generateSizeWarning,
} from "./pr-size.js";

describe("calculatePRSize", () => {
  test("should return empty metrics for empty diff", () => {
    const result = calculatePRSize("");

    expect(result.filesChanged).toBe(0);
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.totalLines).toBe(0);
    expect(result.filesAdded).toBe(0);
    expect(result.filesModified).toBe(0);
    expect(result.filesDeleted).toBe(0);
  });

  test("should return empty metrics for whitespace-only diff", () => {
    const result = calculatePRSize("   \n\n\t  ");

    expect(result.filesChanged).toBe(0);
    expect(result.totalLines).toBe(0);
  });

  test("should count single file additions", () => {
    const diff = `diff --git a/src/utils.ts b/src/utils.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/utils.ts
@@ -0,0 +1,5 @@
+line 1
+line 2
+line 3`;

    const result = calculatePRSize(diff);

    expect(result.filesChanged).toBe(1);
    expect(result.filesAdded).toBe(1);
    expect(result.filesModified).toBe(0);
    expect(result.filesDeleted).toBe(0);
    expect(result.additions).toBe(3);
    expect(result.deletions).toBe(0);
    expect(result.totalLines).toBe(3);
  });

  test("should count single file deletions", () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index 1234567..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3`;

    const result = calculatePRSize(diff);

    expect(result.filesChanged).toBe(1);
    expect(result.filesAdded).toBe(0);
    expect(result.filesModified).toBe(0);
    expect(result.filesDeleted).toBe(1);
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(3);
    expect(result.totalLines).toBe(3);
  });

  test("should count modified file changes", () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
index 1234567..89abcde 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,5 +1,7 @@
 import express from 'express';
 
-line removed
+line added 1
+line added 2
+line added 3`;

    const result = calculatePRSize(diff);

    expect(result.filesChanged).toBe(1);
    expect(result.filesAdded).toBe(0);
    expect(result.filesModified).toBe(1);
    expect(result.filesDeleted).toBe(0);
    expect(result.additions).toBe(3);
    expect(result.deletions).toBe(1);
    expect(result.totalLines).toBe(4);
  });

  test("should handle multiple files", () => {
    const diff = `diff --git a/src/file1.ts b/src/file1.ts
index 123..456 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,3 +1,5 @@
 context
+added 1
+added 2
-old line
 context

diff --git a/src/file2.ts b/src/file2.ts
new file mode 100644
--- /dev/null
+++ b/src/file2.ts
@@ -0,0 +1,2 @@
+new file line 1
+new file line 2`;

    const result = calculatePRSize(diff);

    expect(result.filesChanged).toBe(2);
    expect(result.filesAdded).toBe(1);
    expect(result.filesModified).toBe(1);
    expect(result.filesDeleted).toBe(0);
    expect(result.additions).toBe(4);
    expect(result.deletions).toBe(1);
    expect(result.totalLines).toBe(5);
  });

  test("should handle complex diff with all change types", () => {
    const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+new 1
+new 2
+new 3

diff --git a/src/modified.ts b/src/modified.ts
index 123..456 100644
--- a/src/modified.ts
+++ b/src/modified.ts
@@ -1,2 +1,3 @@
 keep
-removed
+added
 context

diff --git a/src/deleted.ts b/src/deleted.ts
deleted file mode 100644
--- a/src/deleted.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-delete 1
-delete 2`;

    const result = calculatePRSize(diff);

    expect(result.filesChanged).toBe(3);
    expect(result.filesAdded).toBe(1);
    expect(result.filesModified).toBe(1);
    expect(result.filesDeleted).toBe(1);
    expect(result.additions).toBe(4); // 3 from new.ts + 1 from modified.ts
    expect(result.deletions).toBe(3); // 2 from deleted.ts + 1 from modified.ts
    expect(result.totalLines).toBe(7);
  });

  test("should ignore diff metadata lines", () => {
    const diff = `diff --git a/file.ts b/file.ts
index 123..456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,5 @@
-header
+new header`;

    const result = calculatePRSize(diff);

    // Should not count metadata lines like diff --git, index, ---, +++
    expect(result.additions).toBe(1);
    expect(result.deletions).toBe(1);
  });
});

describe("assessPRSize", () => {
  const createDiff = (lines: number): string => {
    const additions: string[] = [];
    for (let i = 0; i < lines; i++) {
      additions.push(`+line ${i}`);
    }
    return `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,0 +1,${lines} @@
${additions.join("\n")}`;
  };

  test("should not trigger warning or block below thresholds", () => {
    const diff = createDiff(10);
    const result = assessPRSize(diff, 50, 100);

    expect(result.warningTriggered).toBe(false);
    expect(result.shouldBlock).toBe(false);
    expect(result.metrics.totalLines).toBe(10);
    expect(result.warningThreshold).toBe(50);
    expect(result.blockThreshold).toBe(100);
  });

  test("should trigger warning when exceeding warning threshold", () => {
    const diff = createDiff(75);
    const result = assessPRSize(diff, 50, 100);

    expect(result.warningTriggered).toBe(true);
    expect(result.shouldBlock).toBe(false);
    expect(result.metrics.totalLines).toBe(75);
  });

  test("should trigger block when exceeding block threshold", () => {
    const diff = createDiff(150);
    const result = assessPRSize(diff, 50, 100);

    expect(result.warningTriggered).toBe(true);
    expect(result.shouldBlock).toBe(true);
    expect(result.metrics.totalLines).toBe(150);
  });

  test("should not trigger warning when threshold is 0 (disabled)", () => {
    const diff = createDiff(500);
    const result = assessPRSize(diff, 0, 1000);

    expect(result.warningTriggered).toBe(false);
    expect(result.shouldBlock).toBe(false);
  });

  test("should not trigger block when threshold is 0 (disabled)", () => {
    const diff = createDiff(500);
    const result = assessPRSize(diff, 100, 0);

    expect(result.warningTriggered).toBe(true);
    expect(result.shouldBlock).toBe(false);
  });

  test("should handle exact threshold boundary", () => {
    const diff = createDiff(49);
    const result = assessPRSize(diff, 50, 100);

    // Should not trigger one below the threshold (using > not >=)
    expect(result.warningTriggered).toBe(false);
    expect(result.metrics.totalLines).toBe(49);
  });

  test("should handle one line over threshold", () => {
    const diff = createDiff(51);
    const result = assessPRSize(diff, 50, 100);

    expect(result.warningTriggered).toBe(true);
    expect(result.shouldBlock).toBe(false);
  });
});

describe("formatSizeMetricsMarkdown", () => {
  test("should format metrics correctly", () => {
    const metrics: PRSizeMetrics = {
      filesChanged: 5,
      additions: 100,
      deletions: 50,
      totalLines: 150,
      filesAdded: 2,
      filesModified: 2,
      filesDeleted: 1,
    };

    const result = formatSizeMetricsMarkdown(metrics);

    expect(result).toBe("150 lines changed (100 additions, 50 deletions) across 5 files");
  });

  test("should handle single file", () => {
    const metrics: PRSizeMetrics = {
      filesChanged: 1,
      additions: 10,
      deletions: 5,
      totalLines: 15,
      filesAdded: 0,
      filesModified: 1,
      filesDeleted: 0,
    };

    const result = formatSizeMetricsMarkdown(metrics);

    expect(result).toBe("15 lines changed (10 additions, 5 deletions) across 1 files");
  });
});

describe("generateSizeWarning", () => {
  test("should generate warning message", () => {
    const metrics: PRSizeMetrics = {
      filesChanged: 3,
      additions: 750,
      deletions: 100,
      totalLines: 850,
      filesAdded: 1,
      filesModified: 2,
      filesDeleted: 0,
    };

    const result = generateSizeWarning(metrics, 500);

    expect(result).toContain("⚠️ PR Size Warning");
    expect(result).toContain("850 lines changed");
    expect(result).toContain("500 line threshold");
    expect(result).toContain("70%"); // (850/500)*100 = 170%, 170-100 = 70%
  });

  test("should calculate percentage correctly", () => {
    const metrics: PRSizeMetrics = {
      filesChanged: 1,
      additions: 600,
      deletions: 0,
      totalLines: 600,
      filesAdded: 0,
      filesModified: 1,
      filesDeleted: 0,
    };

    const result = generateSizeWarning(metrics, 500);

    expect(result).toContain("20%"); // (600/500)*100 = 120%, 120-100 = 20%
  });
});

describe("generateSizeBlockMessage", () => {
  test("should generate block message", () => {
    const metrics: PRSizeMetrics = {
      filesChanged: 10,
      additions: 2500,
      deletions: 100,
      totalLines: 2600,
      filesAdded: 5,
      filesModified: 4,
      filesDeleted: 1,
    };

    const result = generateSizeBlockMessage(metrics, 2000);

    expect(result).toContain("🚫 PR too large");
    expect(result).toContain("2600 lines changed");
    expect(result).toContain("maximum 2000 lines");
    expect(result).toContain("splitting into smaller PRs");
  });
});
