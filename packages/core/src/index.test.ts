import { describe, expect, test } from "bun:test";
import {
  GhostCommitDetector,
  GitDiffOptionsSchema,
  PRMetadataSchema,
  extractChangedFiles,
  extractCommitsFromDiff,
  sanitizeDiff,
} from "./index.js";

describe("sanitizeDiff", () => {
  test("should replace file paths with ellipsis", () => {
    const diff = `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index abc123..def456 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,5 +1,5 @@
-import { useState } from "react";
+import { useState, useEffect } from "react";`;

    const sanitized = sanitizeDiff(diff);

    expect(sanitized).toContain("diff --git a/... b/...");
    expect(sanitized).toContain("+++ b/...");
    expect(sanitized).toContain("--- a/...");
    expect(sanitized).toContain("@@ ... @@");
  });

  test("should handle empty diff", () => {
    expect(sanitizeDiff("")).toBe("");
  });
});

describe("extractChangedFiles", () => {
  test("should extract file paths from diff", () => {
    const diff = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
-export { something } from "./other";
+export { something, other } from "./other";
diff --git a/src/other.ts b/src/other.ts
--- a/src/other.ts
+++ b/src/other.ts
@@ -1,1 +1,1 @@
-const x = 1;
+const x = 2;`;

    const files = extractChangedFiles(diff);

    expect(files).toEqual(["src/index.ts", "src/other.ts"]);
  });

  test("should return empty array for no changes", () => {
    expect(extractChangedFiles("")).toEqual([]);
  });
});

describe("extractCommitsFromDiff", () => {
  test("should extract commit SHAs from patch format", () => {
    const diff = `From abc123def456789012345678901234567890abcd Mon Sep 17 00:00:00 2001
From: Author <author@example.com>
Date: Sun, 16 Jan 2024 12:00:00 +0000
Subject: [PATCH] Initial commit

diff --git a/README.md b/README.md
From def456abc789012345678901234567890abcd1234 Mon Sep 17 00:00:00 2001
From: Other Author <other@example.com>
Date: Sun, 16 Jan 2024 12:01:00 +0000
Subject: [PATCH] Second commit`;

    const commits = extractCommitsFromDiff(diff);

    expect(commits).toHaveLength(2);
    const firstCommit = commits[0];
    const secondCommit = commits[1];
    expect(firstCommit?.sha).toBe("abc123def456789012345678901234567890abcd");
    expect(secondCommit?.sha).toBe("def456abc789012345678901234567890abcd1234");
  });
});

describe("GhostCommitDetector", () => {
  test("should detect no ghost commits for empty inputs", async () => {
    const detector = new GhostCommitDetector();
    const results = await detector.detect("", []);

    expect(results).toEqual([]);
  });

  test("should return results for commits", async () => {
    const detector = new GhostCommitDetector();
    const results = await detector.detect("diff --git a/test.ts b/test.ts", [
      { sha: "abc123", message: "Update test" },
    ]);

    expect(results).toHaveLength(1);
    const firstResult = results[0];
    expect(firstResult?.sha).toBe("abc123");
    expect(firstResult?.message).toBe("Update test");
  });

  test("should use custom sensitivity threshold", () => {
    const detector = new GhostCommitDetector({ sensitivityThreshold: 0.5 });
    expect(detector).toBeDefined();
  });
});

describe("Zod Schemas", () => {
  test("PRMetadataSchema should validate correct data", () => {
    const validData = {
      owner: "owner",
      repo: "repo",
      pullNumber: 123,
      title: "Test PR",
      body: "Test body",
      author: "testuser",
    };

    const result = PRMetadataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test("GitDiffOptionsSchema should validate correct data", () => {
    const validData = {
      owner: "owner",
      repo: "repo",
      baseSha: "abc123",
      headSha: "def456",
      token: "optional-token",
    };

    const result = GitDiffOptionsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test("GitDiffOptionsSchema should work without token", () => {
    const validData = {
      owner: "owner",
      repo: "repo",
      baseSha: "abc123",
      headSha: "def456",
    };

    const result = GitDiffOptionsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
