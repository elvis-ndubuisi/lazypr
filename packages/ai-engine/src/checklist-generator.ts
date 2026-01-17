import type { ChecklistItem } from "./types.js";

const SQL_PATTERNS = [/\.sql$/i, /migration/i, /seeder/i, /schema/i, /database/i];

const AUTH_PATTERNS = [
  /auth/i,
  /login/i,
  /logout/i,
  /session/i,
  /jwt/i,
  /oauth/i,
  /password/i,
  /credential/i,
  /permission/i,
  /role/i,
  /access/i,
  /token/i,
];

const API_PATTERNS = [
  /controller/i,
  /route/i,
  /endpoint/i,
  /handler/i,
  /api/i,
  /service/i,
  /middleware/i,
];

const TEST_PATTERNS = [
  /\.test\./i,
  /\.spec\./i,
  /__tests__/i,
  /test\.js$/i,
  /test\.ts$/i,
  /spec\.js$/i,
  /spec\.ts$/i,
];

const CONFIG_PATTERNS = [/\.json$/i, /\.yaml$/i, /\.yml$/i, /config/i, /settings/i];

const DEPENDENCY_PATTERNS = [
  /package\.json/i,
  /package-lock/i,
  /bun\.lock/i,
  /requirements/i,
  /gemfile/i,
  /cargo\.toml/i,
];

export function generateChecklist(files: string[], _diff: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  const hasSql = files.some((f) => SQL_PATTERNS.some((p) => p.test(f)));
  if (hasSql) {
    items.push({
      text: "Verify migration is reversible",
      priority: "HIGH",
      category: "database",
    });
    items.push({
      text: "Ensure database backup before deployment",
      priority: "HIGH",
      category: "database",
    });
    items.push({
      text: "Check for data integrity issues",
      priority: "MEDIUM",
      category: "database",
    });
  }

  const hasAuth = files.some((f) => AUTH_PATTERNS.some((p) => p.test(f)));
  if (hasAuth) {
    items.push({
      text: "Test authentication flow end-to-end",
      priority: "HIGH",
      category: "security",
    });
    items.push({
      text: "Verify authorization checks in all scenarios",
      priority: "HIGH",
      category: "security",
    });
    items.push({
      text: "Check for session management issues",
      priority: "MEDIUM",
      category: "security",
    });
    items.push({
      text: "Verify token refresh/refresh flow",
      priority: "MEDIUM",
      category: "security",
    });
  }

  const hasApi = files.some((f) => API_PATTERNS.some((p) => p.test(f)));
  if (hasApi) {
    items.push({
      text: "Update API documentation",
      priority: "HIGH",
      category: "api",
    });
    items.push({
      text: "Verify response format and status codes",
      priority: "HIGH",
      category: "api",
    });
    items.push({
      text: "Test error handling scenarios",
      priority: "MEDIUM",
      category: "api",
    });
    items.push({
      text: "Check rate limiting if applicable",
      priority: "LOW",
      category: "api",
    });
  }

  const hasTests = files.some((f) => TEST_PATTERNS.some((p) => p.test(f)));
  if (!hasTests) {
    items.push({
      text: "Add tests for new functionality",
      priority: "MEDIUM",
      category: "testing",
    });
  }

  const hasConfig = files.some((f) => CONFIG_PATTERNS.some((p) => p.test(f)));
  if (hasConfig) {
    items.push({
      text: "Verify configuration changes in staging",
      priority: "MEDIUM",
      category: "configuration",
    });
    items.push({
      text: "Document configuration changes",
      priority: "LOW",
      category: "configuration",
    });
  }

  const hasDeps = files.some((f) => DEPENDENCY_PATTERNS.some((p) => p.test(f)));
  if (hasDeps) {
    items.push({
      text: "Review dependency changes for vulnerabilities",
      priority: "HIGH",
      category: "dependencies",
    });
    items.push({
      text: "Verify compatibility with existing code",
      priority: "MEDIUM",
      category: "dependencies",
    });
    items.push({
      text: "Update lockfile in commit",
      priority: "LOW",
      category: "dependencies",
    });
  }

  const hasSecurityChanges = files.some((f) => /security|crypto|encrypt|decrypt/i.test(f));
  if (hasSecurityChanges) {
    items.push({
      text: "Security audit by team lead",
      priority: "HIGH",
      category: "security",
    });
    items.push({
      text: "Verify encryption keys are not hardcoded",
      priority: "HIGH",
      category: "security",
    });
  }

  const hasFrontend = files.some(
    (f) => /\.jsx?$/i.test(f) || /\.tsx?$/i.test(f) || /\.vue$/i.test(f) || /\.svelte$/i.test(f),
  );
  if (hasFrontend) {
    items.push({
      text: "Verify UI changes in browser",
      priority: "MEDIUM",
      category: "frontend",
    });
    items.push({
      text: "Check for accessibility issues",
      priority: "LOW",
      category: "frontend",
    });
    items.push({
      text: "Verify responsive behavior",
      priority: "LOW",
      category: "frontend",
    });
  }

  items.push({
    text: "Code follows project style guidelines",
    priority: "LOW",
    category: "general",
  });
  items.push({
    text: "No debug or console.log statements left",
    priority: "LOW",
    category: "general",
  });

  return sortChecklist(items);
}

export function generateVisualDiffMap(
  diff: string,
): Array<{ file: string; before: string; after: string }> {
  const maps: Array<{ file: string; before: string; after: string }> = [];

  const fileHeaderPattern = /^diff --git a\/(.+?) b\/(.+)$/gm;
  let match: RegExpExecArray | null = fileHeaderPattern.exec(diff);

  while (match !== null) {
    const capturedFile = match[2];
    const file = typeof capturedFile === "string" ? capturedFile : "";
    const fileDiff = extractFileDiff(diff, match.index);

    const beforeLines: string[] = [];
    const afterLines: string[] = [];

    const lines = fileDiff.split("\n");
    for (const line of lines) {
      if (line.startsWith("-") && !line.startsWith("---")) {
        beforeLines.push(line.substring(1));
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        afterLines.push(line.substring(1));
      }
    }

    if (beforeLines.length > 0 || afterLines.length > 0) {
      maps.push({
        file,
        before: beforeLines.slice(0, 5).join("\n"),
        after: afterLines.slice(0, 5).join("\n"),
      });
    }
    match = fileHeaderPattern.exec(diff);
  }

  return maps.slice(0, 10);
}

function extractFileDiff(fullDiff: string, startIndex: number): string {
  const endIndex = fullDiff.indexOf("diff --git a/", startIndex + 1);
  if (endIndex === -1) {
    return fullDiff.substring(startIndex);
  }
  return fullDiff.substring(startIndex, endIndex);
}

function sortChecklist(items: ChecklistItem[]): ChecklistItem[] {
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.category.localeCompare(b.category);
  });
}

export function formatChecklistAsMarkdown(items: ChecklistItem[]): string {
  let output = "### Reviewer Checklist\n\n";

  const categories = [...new Set(items.map((item) => item.category))];

  for (const category of categories) {
    const categoryItems = items.filter((item) => item.category === category);
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

    output += `#### ${categoryTitle}\n`;
    for (const item of categoryItems) {
      const priorityMarker =
        item.priority === "HIGH" ? "🔴" : item.priority === "MEDIUM" ? "🟡" : "🟢";
      output += `- ${priorityMarker} ${item.text}\n`;
    }
    output += "\n";
  }

  return output;
}
