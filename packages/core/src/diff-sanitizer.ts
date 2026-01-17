import gitdiffParser from "gitdiff-parser";

const parse: (source: string) => File[] =
  (gitdiffParser as { parse?: (source: string) => File[] }).parse ?? (() => []);

interface File {
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    changes: Array<{
      type: "insert" | "delete" | "normal";
      content: string;
      lineNumber?: number;
      oldLineNumber?: number;
      newLineNumber?: number;
    }>;
  }>;
  oldPath: string;
  newPath: string;
  type: "add" | "delete" | "modify" | "rename" | "copy";
}

/**
 * Represents a parsed file from a git diff.
 */
export interface ParsedFile {
  oldPath: string;
  newPath: string;
  type: "add" | "delete" | "modify" | "rename";
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: Array<{ type: "context" | "add" | "delete"; content: string }>;
  }>;
}

/**
 * Options for sanitizing a diff.
 */
export interface SanitizeOptions {
  excludeLockfiles?: boolean;
  excludeNonCodeAssets?: boolean;
  excludeTests?: boolean;
  excludeConfigs?: boolean;
}

/**
 * Default lockfile patterns to exclude from diffs.
 */
const DEFAULT_LOCKFILE_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lock$/,
  /Gemfile\.lock$/,
  /poetry\.lock$/,
  /Cargo\.lock$/,
  /go\.mod$/,
  /go\.sum$/,
  /\.csproj\.packages\.config$/,
  /nuget\.packages$/,
  /requirements\.txt$/,
  /Pipfile\.lock$/,
];

/**
 * Non-code asset patterns to exclude from diffs.
 */
const DEFAULT_NON_CODE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|ico|bmp|webp|svg)$/i,
  /\.(mp3|mp4|wav|flac|ogg|webm)$/i,
  /\.(zip|tar|gz|rar|7z|tar\.gz)$/i,
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
  /\.(eot|ttf|woff|woff2|otf)$/i,
];

/**
 * Test file patterns to exclude from diffs.
 */
const DEFAULT_TEST_PATTERNS = [
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /__tests__\//i,
  /\.test\.(js|ts|jsx|tsx)\.snap$/i,
  /fixtures\//i,
];

/**
 * Config file patterns to exclude from diffs.
 */
const DEFAULT_CONFIG_PATTERNS = [
  /\.eslintrc/i,
  /\.prettierrc/i,
  /tsconfig\.json$/i,
  /jest\.config\./i,
  /vitest\.config\./i,
  /\.vscode\//i,
  /\.idea\//i,
];

/**
 * Sanitizes git diffs by filtering out lockfiles, non-code assets, tests, and configs.
 *
 * This class uses gitdiff-parser to parse diffs and provides methods to filter
 * out files that are not relevant for PR summary generation.
 *
 * @example
 * ```typescript
 * const sanitizer = new DiffSanitizer();
 * const parsed = sanitizer.parse(diff);
 * const filtered = sanitizer.sanitize(parsed, {
 *   excludeLockfiles: true,
 *   excludeNonCodeAssets: true,
 * });
 * ```
 */
export class DiffSanitizer {
  private readonly lockfilePatterns: RegExp[];
  private readonly nonCodePatterns: RegExp[];
  private readonly testPatterns: RegExp[];
  private readonly configPatterns: RegExp[];

  /**
   * Creates a new DiffSanitizer with custom patterns.
   *
   * @param options - Configuration options for custom patterns
   */
  constructor(options?: {
    lockfilePatterns?: RegExp[];
    nonCodePatterns?: RegExp[];
    testPatterns?: RegExp[];
    configPatterns?: RegExp[];
  }) {
    this.lockfilePatterns = options?.lockfilePatterns ?? DEFAULT_LOCKFILE_PATTERNS;
    this.nonCodePatterns = options?.nonCodePatterns ?? DEFAULT_NON_CODE_PATTERNS;
    this.testPatterns = options?.testPatterns ?? DEFAULT_TEST_PATTERNS;
    this.configPatterns = options?.configPatterns ?? DEFAULT_CONFIG_PATTERNS;
  }

  /**
   * Parses a raw git diff string into structured file objects.
   *
   * @param diff - The raw git diff string
   * @returns Array of parsed file objects
   */
  parse(diff: string): ParsedFile[] {
    const files = parse(diff);
    return files.map((file): ParsedFile => {
      const typeMap: Record<string, "add" | "delete" | "modify" | "rename"> = {
        add: "add",
        delete: "delete",
        modify: "modify",
        rename: "rename",
      };

      return {
        oldPath: file.oldPath,
        newPath: file.newPath,
        type: typeMap[file.type] || "modify",
        hunks: file.hunks.map((hunk) => ({
          oldStart: hunk.oldStart,
          oldLines: hunk.oldLines,
          newStart: hunk.newStart,
          newLines: hunk.newLines,
          lines: hunk.changes.map((change) => {
            let type: "context" | "add" | "delete";
            if (change.type === "insert") {
              type = "add";
            } else if (change.type === "delete") {
              type = "delete";
            } else {
              type = "context";
            }
            return {
              type,
              content: change.content,
            };
          }),
        })),
      };
    });
  }

  /**
   * Checks if a file path is a lockfile.
   *
   * @param path - The file path to check
   * @returns True if the file is a lockfile
   */
  isLockfile(path: string): boolean {
    return this.lockfilePatterns.some((pattern) => pattern.test(path));
  }

  /**
   * Checks if a file path is a non-code asset.
   *
   * @param path - The file path to check
   * @returns True if the file is a non-code asset
   */
  isNonCodeAsset(path: string): boolean {
    return this.nonCodePatterns.some((pattern) => pattern.test(path));
  }

  /**
   * Checks if a file path is a test file.
   *
   * @param path - The file path to check
   * @returns True if the file is a test file
   */
  isTestFile(path: string): boolean {
    return this.testPatterns.some((pattern) => pattern.test(path));
  }

  /**
   * Checks if a file path is a config file.
   *
   * @param path - The file path to check
   * @returns True if the file is a config file
   */
  isConfigFile(path: string): boolean {
    return this.configPatterns.some((pattern) => pattern.test(path));
  }

  /**
   * Filters out lockfiles from an array of parsed files.
   *
   * @param files - Array of parsed files
   * @returns Filtered array without lockfiles
   */
  filterLockfiles(files: ParsedFile[]): ParsedFile[] {
    return files.filter((file) => !this.isLockfile(file.newPath));
  }

  /**
   * Filters out non-code assets from an array of parsed files.
   *
   * @param files - Array of parsed files
   * @returns Filtered array without non-code assets
   */
  filterNonCodeAssets(files: ParsedFile[]): ParsedFile[] {
    return files.filter((file) => !this.isNonCodeAsset(file.newPath));
  }

  /**
   * Filters out test files from an array of parsed files.
   *
   * @param files - Array of parsed files
   * @returns Filtered array without test files
   */
  filterTestFiles(files: ParsedFile[]): ParsedFile[] {
    return files.filter((file) => !this.isTestFile(file.newPath));
  }

  /**
   * Filters out config files from an array of parsed files.
   *
   * @param files - Array of parsed files
   * @returns Filtered array without config files
   */
  filterConfigFiles(files: ParsedFile[]): ParsedFile[] {
    return files.filter((file) => !this.isConfigFile(file.newPath));
  }

  /**
   * Sanitizes an array of parsed files based on the provided options.
   *
   * @param files - Array of parsed files
   * @param options - Sanitization options
   * @returns Sanitized array of files
   */
  sanitize(files: ParsedFile[], options: SanitizeOptions = {}): ParsedFile[] {
    let result = files;

    if (options.excludeLockfiles !== false) {
      result = this.filterLockfiles(result);
    }

    if (options.excludeNonCodeAssets !== false) {
      result = this.filterNonCodeAssets(result);
    }

    if (options.excludeTests) {
      result = this.filterTestFiles(result);
    }

    if (options.excludeConfigs) {
      result = this.filterConfigFiles(result);
    }

    return result;
  }

  /**
   * Reconstructs a git diff string from parsed files.
   *
   * @param files - Array of parsed files
   * @returns Reconstructed git diff string
   */
  reconstruct(files: ParsedFile[]): string {
    return files
      .map((file) => {
        let diff = `diff --git a/${file.oldPath} b/${file.newPath}\n`;
        diff += `--- a/${file.oldPath}\n`;
        diff += `+++ b/${file.newPath}\n`;

        for (const hunk of file.hunks) {
          diff += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;
          for (const line of hunk.lines) {
            const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";
            diff += `${prefix}${line.content}\n`;
          }
        }

        return diff;
      })
      .join("\n");
  }
}
