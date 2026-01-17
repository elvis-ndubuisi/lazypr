import type { ParsedFile } from "./diff-sanitizer.js";

/**
 * Represents the token weight of a file including its risk level.
 */
export interface TokenWeight {
  file: ParsedFile;
  tokens: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Options for truncating files based on token weight.
 */
export interface TruncateOptions {
  maxTokens: number;
  priorityOrder?: Array<"HIGH" | "MEDIUM" | "LOW">;
}

/**
 * High-risk file patterns that should be prioritized for inclusion.
 */
const HIGH_RISK_PATTERNS = [
  /auth/i,
  /security/i,
  /permission/i,
  /role/i,
  /access/i,
  /login/i,
  /logout/i,
  /password/i,
  /credential/i,
  /token/i,
  /jwt/i,
  /oauth/i,
  /api[_-]?key/i,
  /secret/i,
  /encryption/i,
  /crypt/i,
  /schema[_-]?migration/i,
  /database[_-]?migration/i,
  /sql[_-]?migration/i,
];

/**
 * Low-risk file patterns that can be truncated first.
 */
const LOW_RISK_PATTERNS = [
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /__tests__\//i,
  /\.test\.(js|ts|jsx|tsx)\.snap$/i,
  /fixtures\//i,
  /\.eslintrc/i,
  /\.prettierrc/i,
  /tsconfig\.json$/i,
  /jest\.config\./i,
  /vitest\.config\./i,
  /\.gitignore$/i,
  /\.dockerignore$/i,
  /README/i,
  /CHANGELOG/i,
  /LICENSE/i,
  /\.md$/i,
];

/**
 * Estimates the number of tokens for a file based on its content.
 *
 * Uses a simple character-based estimation (4 characters per token on average)
 * which is suitable for most use cases. For more accurate counting with
 * specific models (like OpenAI's models), consider using tiktoken.
 */
export class TokenManager {
  private readonly highRiskPatterns: RegExp[];
  private readonly lowRiskPatterns: RegExp[];

  /**
   * Creates a new TokenManager with custom risk patterns.
   *
   * @param options - Configuration options for custom patterns
   */
  constructor(options?: {
    highRiskPatterns?: RegExp[];
    lowRiskPatterns?: RegExp[];
  }) {
    this.highRiskPatterns = options?.highRiskPatterns ?? HIGH_RISK_PATTERNS;
    this.lowRiskPatterns = options?.lowRiskPatterns ?? LOW_RISK_PATTERNS;
  }

  /**
   * Estimates the number of tokens for a single line.
   */
  private estimateLineTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Estimates the number of tokens for a file based on its parsed structure.
   *
   * @param file - The parsed file to estimate tokens for
   * @returns Estimated token count
   */
  estimateFileTokens(file: ParsedFile): number {
    let tokens = Math.ceil(file.newPath.length / 4);

    for (const hunk of file.hunks) {
      tokens += 3;

      for (const line of hunk.lines) {
        tokens += this.estimateLineTokens(line.content);
      }
    }

    return tokens;
  }

  /**
   * Determines the risk level for a file based on its path.
   *
   * @param path - The file path to assess
   * @returns Risk level (HIGH, MEDIUM, or LOW)
   */
  assessRiskLevel(path: string): "HIGH" | "MEDIUM" | "LOW" {
    if (this.highRiskPatterns.some((pattern) => pattern.test(path))) {
      return "HIGH";
    }

    if (this.lowRiskPatterns.some((pattern) => pattern.test(path))) {
      return "LOW";
    }

    return "MEDIUM";
  }

  /**
   * Calculates the token weight for multiple files.
   *
   * @param files - Array of parsed files
   * @returns Array of TokenWeight objects
   */
  calculateWeights(files: ParsedFile[]): TokenWeight[] {
    return files.map((file) => ({
      file,
      tokens: this.estimateFileTokens(file),
      riskLevel: this.assessRiskLevel(file.newPath),
    }));
  }

  /**
   * Truncates files based on their token weight and risk level.
   *
   * Files are sorted by risk level (according to priorityOrder) and then by
   * token count. The least important files are removed first until the
   * total token count is within the limit.
   *
   * @param files - Array of parsed files to truncate
   * @param options - Truncation options
   * @returns Truncated array of files (still sorted by priority)
   */
  truncate(files: ParsedFile[], options: TruncateOptions): ParsedFile[] {
    const priorityOrder = options.priorityOrder ?? ["LOW", "MEDIUM", "HIGH"];
    const weights = this.calculateWeights(files);

    const sorted = [...weights].sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a.riskLevel);
      const priorityB = priorityOrder.indexOf(b.riskLevel);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return a.tokens - b.tokens;
    });

    let currentTokens = 0;
    const kept: TokenWeight[] = [];

    for (const weight of sorted) {
      if (currentTokens + weight.tokens <= options.maxTokens) {
        kept.push(weight);
        currentTokens += weight.tokens;
      }
    }

    const result = kept.map((w) => w.file);

    return result.sort((a, b) => {
      const riskA = this.assessRiskLevel(a.newPath);
      const riskB = this.assessRiskLevel(b.newPath);
      const priorityA = priorityOrder.indexOf(riskA);
      const priorityB = priorityOrder.indexOf(riskB);
      return priorityA - priorityB;
    });
  }

  /**
   * Gets the total token count for an array of files.
   *
   * @param files - Array of parsed files
   * @returns Total estimated token count
   */
  getTotalTokens(files: ParsedFile[]): number {
    return files.reduce((total, file) => total + this.estimateFileTokens(file), 0);
  }

  /**
   * Checks if the total token count exceeds the limit and needs truncation.
   *
   * @param files - Array of parsed files
   * @param maxTokens - Maximum token limit
   * @returns True if truncation is needed
   */
  needsTruncation(files: ParsedFile[], maxTokens: number): boolean {
    return this.getTotalTokens(files) > maxTokens;
  }
}
