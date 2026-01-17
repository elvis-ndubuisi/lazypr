import { describe, expect, test } from "bun:test";
import {
  formatChecklistAsMarkdown,
  generateChecklist,
  generateVisualDiffMap,
} from "./checklist-generator.js";

describe("generateChecklist", () => {
  test("should generate SQL-related checklist items", () => {
    const items = generateChecklist(["db/migration/001_add_users.sql"], "");

    const categories = items.map((item) => item.category);
    expect(categories).toContain("database");

    const sqlItems = items.filter((item) => item.category === "database");
    expect(sqlItems.length).toBeGreaterThan(0);
    expect(sqlItems.some((item) => item.text.includes("reversible"))).toBe(true);
  });

  test("should generate auth-related checklist items", () => {
    const items = generateChecklist(["src/auth/login.ts"], "");

    const categories = items.map((item) => item.category);
    expect(categories).toContain("security");

    const authItems = items.filter((item) => item.category === "security");
    expect(authItems.length).toBeGreaterThan(0);
    expect(authItems.some((item) => item.text.includes("authentication"))).toBe(true);
  });

  test("should generate API-related checklist items", () => {
    const items = generateChecklist(["src/controllers/user.ts"], "");

    const categories = items.map((item) => item.category);
    expect(categories).toContain("api");

    const apiItems = items.filter((item) => item.category === "api");
    expect(apiItems.length).toBeGreaterThan(0);
    expect(apiItems.some((item) => item.text.includes("documentation"))).toBe(true);
  });

  test("should not add test items if tests exist", () => {
    const items = generateChecklist(["src/user.ts", "src/user.test.ts"], "");

    const testingItems = items.filter((item) => item.category === "testing");
    expect(testingItems.length).toBe(0);
  });

  test("should add test items if no tests exist", () => {
    const items = generateChecklist(["src/user.ts"], "");

    const testingItems = items.filter((item) => item.category === "testing");
    expect(testingItems.length).toBeGreaterThan(0);
  });

  test("should generate frontend-related checklist items", () => {
    const items = generateChecklist(["src/components/Button.tsx"], "");

    const categories = items.map((item) => item.category);
    expect(categories).toContain("frontend");
  });

  test("should generate dependency-related checklist items", () => {
    const items = generateChecklist(["package.json"], "");

    const categories = items.map((item) => item.category);
    expect(categories).toContain("dependencies");
  });

  test("should sort items by priority", () => {
    const items = generateChecklist(["db/migration/001_add_users.sql"], "");
    const highPriority = items.filter((item) => item.priority === "HIGH");
    const mediumPriority = items.filter((item) => item.priority === "MEDIUM");

    const highItem = highPriority[0];
    const mediumItem = mediumPriority[0];

    if (highItem && mediumItem) {
      const highIndex = items.indexOf(highItem);
      const mediumIndex = items.indexOf(mediumItem);
      expect(highIndex).toBeLessThan(mediumIndex);
    }
  });

  test("should include general checklist items", () => {
    const items = generateChecklist(["src/utils/helpers.ts"], "");

    const generalItems = items.filter((item) => item.category === "general");
    expect(generalItems.length).toBeGreaterThan(0);
  });
});

describe("generateVisualDiffMap", () => {
  test("should extract file changes from diff", () => {
    const diff = `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,3 +1,3 @@
-const old = "value";
+const new = "newValue";`;

    const maps = generateVisualDiffMap(diff);

    expect(maps.length).toBeGreaterThan(0);
    const authMap = maps.find((m) => m.file.includes("auth.ts"));
    expect(authMap).toBeDefined();
  });

  test("should return empty array for empty diff", () => {
    const maps = generateVisualDiffMap("");

    expect(maps).toEqual([]);
  });

  test("should limit to 10 files", () => {
    const diff = `
diff --git a/file1.ts b/file1.ts
--- a/file1.ts
+++ b/file1.ts
@@ -1 +1 @@
-a
+b
diff --git a/file2.ts b/file2.ts
--- a/file2.ts
+++ b/file2.ts
@@ -1 +1 @@
-a
+b
diff --git a/file3.ts b/file3.ts
--- a/file3.ts
+++ a/file3.ts
@@ -1 +1 @@
-a
+b
`.repeat(20);

    const maps = generateVisualDiffMap(diff);

    expect(maps.length).toBeLessThanOrEqual(10);
  });
});

describe("formatChecklistAsMarkdown", () => {
  test("should format checklist as markdown", () => {
    const items = generateChecklist(["db/migration/001_add_users.sql"], "");
    const markdown = formatChecklistAsMarkdown(items);

    expect(markdown).toContain("### Reviewer Checklist");
    expect(markdown).toContain("#### Database");
    expect(markdown).toContain("🔴");
    expect(markdown).toContain("🟡");
    expect(markdown).toContain("🟢");
  });

  test("should include priority markers", () => {
    const items = generateChecklist(["db/migration/001_add_users.sql"], "");
    const markdown = formatChecklistAsMarkdown(items);

    expect(markdown).toContain("🔴");
    expect(markdown).toContain("🟡");
    expect(markdown).toContain("🟢");
  });

  test("should handle empty checklist", () => {
    const markdown = formatChecklistAsMarkdown([]);

    expect(markdown).toContain("### Reviewer Checklist");
  });
});
