/**
 * PR Title Enhancer - Detects and improves vague PR titles
 *
 * Analyzes PR titles for vagueness and suggests/improves them based on
 * the actual code changes in the diff.
 */

export interface TitleEnhancementResult {
  /** Whether the title is considered vague */
  isVague: boolean;
  /** Vagueness score (0-100, >= 70 is vague) */
  score: number;
  /** Human-readable reason for the score */
  reason: string;
  /** Suggested improved title (only if vague) */
  suggestedTitle?: string;
}

interface VaguenessPattern {
  /** Regex pattern to match against title */
  pattern: RegExp;
  /** Score contribution when matched */
  score: number;
  /** Description of why this is vague */
  description: string;
}

/**
 * Default patterns that indicate a vague title
 */
const DEFAULT_VAGUE_PATTERNS: VaguenessPattern[] = [
  {
    pattern: /^(update|fix|wip|changes|modified|refactor|clean)$/i,
    score: 30,
    description: "Generic action verb without context",
  },
  {
    pattern: /^(auth|config|stuff|things|main|test|api|ui|css|bug)$/i,
    score: 35,
    description: "Single generic word without details",
  },
  { pattern: /^.{1,15}$/, score: 30, description: "Very short title (< 15 chars)" },
  { pattern: /^\s*$/g, score: 100, description: "Empty or whitespace-only title" },
  {
    pattern: /^(?:.*\s)?(?:fix|update|change|add|remove)\s*(?:it|this|that|stuff|things|code)$/i,
    score: 40,
    description: "Generic action + generic noun",
  },
  {
    pattern: /\b(tmp|temp|temporary|wip|draft)\b/i,
    score: 25,
    description: "Contains temporary/WIP indicators",
  },
];

/**
 * Analyzes a PR title for vagueness and suggests improvements
 *
 * @example
 * ```typescript
 * const enhancer = new PRTitleEnhancer();
 * const result = enhancer.analyze("fix auth", "diff content...", ["src/auth/login.ts"]);
 * // result.isVague = true
 * // result.score = 85
 * // result.suggestedTitle = "Fix JWT authentication token validation in login"
 * ```
 */
export class PRTitleEnhancer {
  private patterns: VaguenessPattern[];

  constructor(customPatterns?: VaguenessPattern[]) {
    this.patterns = customPatterns ?? DEFAULT_VAGUE_PATTERNS;
  }

  /**
   * Analyzes the title and returns enhancement suggestions
   *
   * @param title - Current PR title
   * @param diff - The git diff content
   * @param files - List of changed files
   * @returns Analysis result with score and suggestion
   */
  analyze(title: string, diff: string, files: string[]): TitleEnhancementResult {
    const { score, reasons } = this.calculateVaguenessScore(title);
    const threshold = 70;

    if (score < threshold) {
      return {
        isVague: false,
        score,
        reason: reasons.join("; ") || "Title is descriptive enough",
      };
    }

    // Title is vague, generate improvement
    const suggestedTitle = this.generateImprovedTitle(title, diff, files);

    return {
      isVague: true,
      score,
      reason: reasons.join("; "),
      suggestedTitle,
    };
  }

  /**
   * Calculates the vagueness score (0-100)
   * Score >= 70 means the title is considered vague
   */
  private calculateVaguenessScore(title: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const matchedPatterns = new Set<string>();

    // Check each pattern
    for (const { pattern, score: points, description } of this.patterns) {
      if (pattern.test(title) && !matchedPatterns.has(description)) {
        score += points;
        reasons.push(description);
        matchedPatterns.add(description);
      }
    }

    // No ticket reference increases vagueness
    if (!/[A-Z]+-\d+|#\d+/.test(title)) {
      score += 15;
      reasons.push("No ticket reference (JIRA/GitHub issue)");
    }

    // Too many generic words
    const genericWords = (
      title.match(/\b(fix|update|change|add|remove|implement|create|delete|modify)\b/gi) ?? []
    ).length;
    if (genericWords > 1) {
      score += 10;
      reasons.push("Multiple generic action words");
    }

    // Cap at 100
    return { score: Math.min(score, 100), reasons };
  }

  /**
   * Generates an improved title based on the actual changes
   *
   * This uses heuristics to extract meaning from the diff
   */
  private generateImprovedTitle(originalTitle: string, diff: string, files: string[]): string {
    // Extract key information from files
    const fileContexts = this.extractFileContexts(files);

    // Look for key changes in diff
    const keyChanges = this.extractKeyChanges(diff);

    // Determine the main action
    const action = this.inferAction(originalTitle, keyChanges);

    // Build improved title
    const components: string[] = [action];

    // Add context from files
    if (fileContexts.length > 0) {
      components.push(fileContexts.join(" "));
    }

    // Add specific change details
    if (keyChanges.length > 0 && keyChanges[0]) {
      components.push(keyChanges[0]);
    }

    // Join and clean up
    let improved = components.join(" ").replace(/\s+/g, " ").trim();

    // Capitalize first letter
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);

    // Ensure reasonable length (50-80 chars ideal)
    if (improved.length > 80) {
      improved = `${improved.substring(0, 77)}...`;
    }

    return improved || this.fallbackTitle(originalTitle, files);
  }

  /**
   * Extracts context from file paths
   */
  private extractFileContexts(files: string[]): string[] {
    const contexts = new Set<string>();

    for (const file of files.slice(0, 5)) {
      // Extract directory names
      const parts = file.split("/");

      // Skip common non-descriptive directories
      const skipDirs = new Set(["src", "lib", "dist", "build", "public", "assets"]);

      for (const part of parts) {
        if (part && !skipDirs.has(part) && !part.includes(".") && part.length > 2) {
          contexts.add(part);
        }
      }

      // Extract meaningful file names (without extension)
      const filename = parts[parts.length - 1];
      if (filename) {
        const nameWithoutExt = filename.split(".")[0];
        if (nameWithoutExt && nameWithoutExt.length > 2 && !skipDirs.has(nameWithoutExt)) {
          contexts.add(nameWithoutExt);
        }
      }
    }

    return Array.from(contexts).slice(0, 3);
  }

  /**
   * Extracts key changes from the diff
   */
  private extractKeyChanges(diff: string): string[] {
    const changes: string[] = [];

    // Look for added functions/classes
    const functionMatches = diff.match(
      /^[+].*\b(function|const|class|export\s+(?:default\s+)?(?:function|class|const))\s+(\w+)/gm,
    );
    if (functionMatches) {
      for (const match of functionMatches.slice(0, 2)) {
        const name = match
          .match(/\b\w+\s*[=\(]/g)
          ?.pop()
          ?.replace(/[=\(]/, "");
        if (name && name.length > 2) {
          changes.push(name);
        }
      }
    }

    // Look for significant additions (+ lines)
    const addedLines = diff.match(/^[+].{10,}/gm) ?? [];
    if (addedLines.length > 5) {
      changes.push("multiple components");
    }

    return changes;
  }

  /**
   * Infers the action from title or changes
   */
  private inferAction(originalTitle: string, keyChanges: string[]): string {
    // Check for action words in original title
    const actions = [
      { words: ["fix", "bug", "repair", "correct", "resolve"], action: "Fix" },
      { words: ["add", "create", "implement", "introduce", "new"], action: "Add" },
      { words: ["update", "upgrade", "change", "modify", "refactor"], action: "Update" },
      { words: ["remove", "delete", "clean", "drop", "eliminate"], action: "Remove" },
      { words: ["test", "spec", "coverage"], action: "Test" },
      { words: ["doc", "readme", "comment", "guide"], action: "Document" },
    ];

    const titleLower = originalTitle.toLowerCase();
    for (const { words, action } of actions) {
      if (words.some((w) => titleLower.includes(w))) {
        return action;
      }
    }

    // Default based on changes
    if (keyChanges.length > 0) {
      return "Update";
    }

    return "Modify";
  }

  /**
   * Fallback title when we can't generate a good one
   */
  private fallbackTitle(originalTitle: string, files: string[]): string {
    if (files.length === 1) {
      return `Update ${
        files[0]
          ?.split("/")
          .pop()
          ?.replace(/\.\w+$/, "") || "files"
      }`;
    }
    if (files.length > 1) {
      const dir = files[0]?.split("/").slice(0, -1).pop();
      return `Update ${files.length} files in ${dir || "repository"}`;
    }
    return `Update: ${originalTitle}`;
  }
}

/**
 * Quick helper function for one-off title analysis
 *
 * @example
 * ```typescript
 * const result = analyzeTitle("fix auth", diff, files);
 * if (result.isVague) {
 *   console.log(`Suggested: ${result.suggestedTitle}`);
 * }
 * ```
 */
export function analyzeTitle(title: string, diff: string, files: string[]): TitleEnhancementResult {
  const enhancer = new PRTitleEnhancer();
  return enhancer.analyze(title, diff, files);
}
