import type { FileImpact, ImpactScorerOptions, RiskLevel } from "./types.js";

const DEFAULT_HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /auth\.js$/i, reason: "Authentication logic" },
  { pattern: /auth\.ts$/i, reason: "Authentication logic" },
  { pattern: /login\.js$/i, reason: "Login handling" },
  { pattern: /login\.ts$/i, reason: "Login handling" },
  { pattern: /logout\.js$/i, reason: "Logout handling" },
  { pattern: /logout\.ts$/i, reason: "Logout handling" },
  { pattern: /session\.js$/i, reason: "Session management" },
  { pattern: /session\.ts$/i, reason: "Session management" },
  { pattern: /jwt\.js$/i, reason: "JWT handling" },
  { pattern: /jwt\.ts$/i, reason: "JWT handling" },
  { pattern: /oauth\.js$/i, reason: "OAuth handling" },
  { pattern: /oauth\.ts$/i, reason: "OAuth handling" },
  { pattern: /password\.js$/i, reason: "Password handling" },
  { pattern: /password\.ts$/i, reason: "Password handling" },
  { pattern: /credential/i, reason: "Credentials handling" },
  { pattern: /secret/i, reason: "Secrets handling" },
  { pattern: /apikey/i, reason: "API key handling" },
  { pattern: /schema\.js$/i, reason: "Database schema" },
  { pattern: /schema\.ts$/i, reason: "Database schema" },
  { pattern: /migration/i, reason: "Database migration" },
  { pattern: /seeder/i, reason: "Database seeding" },
  { pattern: /permission/i, reason: "Permission logic" },
  { pattern: /role/i, reason: "Role-based access" },
  { pattern: /access\.js$/i, reason: "Access control" },
  { pattern: /access\.ts$/i, reason: "Access control" },
  { pattern: /security/i, reason: "Security-related" },
  { pattern: /firewall/i, reason: "Firewall rules" },
  { pattern: /rate[\s-]?limit/i, reason: "Rate limiting" },
  { pattern: /csrf/i, reason: "CSRF protection" },
  { pattern: /cors/i, reason: "CORS configuration" },
  { pattern: /ssl/i, reason: "SSL/TLS configuration" },
  { pattern: /https?\.config/i, reason: "HTTP configuration" },
];

const DEFAULT_MEDIUM_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /controller\.js$/i, reason: "API controller" },
  { pattern: /controller\.ts$/i, reason: "API controller" },
  { pattern: /service\.js$/i, reason: "Business logic" },
  { pattern: /service\.ts$/i, reason: "Business logic" },
  { pattern: /route\.js$/i, reason: "API route" },
  { pattern: /route\.ts$/i, reason: "API route" },
  { pattern: /endpoint/i, reason: "API endpoint" },
  { pattern: /api\.js$/i, reason: "API definition" },
  { pattern: /api\.ts$/i, reason: "API definition" },
  { pattern: /handler\.js$/i, reason: "Request handler" },
  { pattern: /handler\.ts$/i, reason: "Request handler" },
  { pattern: /middleware/i, reason: "Middleware" },
  { pattern: /validator/i, reason: "Input validation" },
  { pattern: /serializer/i, reason: "Response serialization" },
  { pattern: /transformer/i, reason: "Data transformation" },
  { pattern: /model\.js$/i, reason: "Data model" },
  { pattern: /model\.ts$/i, reason: "Data model" },
  { pattern: /entity/i, reason: "Database entity" },
  { pattern: /repository/i, reason: "Data repository" },
  { pattern: /dao/i, reason: "Data access object" },
];

const DEFAULT_LOW_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /test\.js$/i, reason: "Test file" },
  { pattern: /test\.ts$/i, reason: "Test file" },
  { pattern: /\.spec\.js$/i, reason: "Test file" },
  { pattern: /\.spec\.ts$/i, reason: "Test file" },
  { pattern: /\.test\.js$/i, reason: "Test file" },
  { pattern: /\.test\.ts$/i, reason: "Test file" },
  { pattern: /fixture/i, reason: "Test fixture" },
  { pattern: /mock/i, reason: "Test mock" },
  { pattern: /\.d\.ts$/i, reason: "Type definition" },
  { pattern: /types\.js$/i, reason: "Type definitions" },
  { pattern: /types\.ts$/i, reason: "Type definitions" },
  { pattern: /types\.d\.ts$/i, reason: "Type definitions" },
  { pattern: /readme/i, reason: "Documentation" },
  { pattern: /changelog/i, reason: "Changelog" },
  { pattern: /license/i, reason: "License file" },
  { pattern: /\.md$/i, reason: "Markdown documentation" },
  { pattern: /\.json$/i, reason: "JSON config (low risk)" },
  { pattern: /\.yml$/i, reason: "YAML config (low risk)" },
  { pattern: /\.yaml$/i, reason: "YAML config (low risk)" },
  { pattern: /\.env/i, reason: "Environment config" },
  { pattern: /gitignore/i, reason: "Git ignore" },
  { pattern: /dockerfile/i, reason: "Docker configuration" },
  { pattern: /docker-compose/i, reason: "Docker compose" },
  { pattern: /\.dockerignore/i, reason: "Docker ignore" },
];

export class ImpactScorer {
  private highRiskPatterns: Array<{ pattern: RegExp; reason: string }>;
  private mediumRiskPatterns: Array<{ pattern: RegExp; reason: string }>;
  private lowRiskPatterns: Array<{ pattern: RegExp; reason: string }>;

  constructor(options?: ImpactScorerOptions) {
    this.highRiskPatterns = [
      ...DEFAULT_HIGH_RISK_PATTERNS,
      ...(options?.customPatterns?.filter((p) => p.riskLevel === "HIGH") ?? []),
    ];
    this.mediumRiskPatterns = [
      ...DEFAULT_MEDIUM_RISK_PATTERNS,
      ...(options?.customPatterns?.filter((p) => p.riskLevel === "MEDIUM") ?? []),
    ];
    this.lowRiskPatterns = [
      ...DEFAULT_LOW_RISK_PATTERNS,
      ...(options?.customPatterns?.filter((p) => p.riskLevel === "LOW") ?? []),
    ];
  }

  assessFile(file: string): FileImpact {
    const fileName = file.split("/").pop() ?? file;

    for (const { pattern, reason } of this.highRiskPatterns) {
      if (pattern.test(fileName)) {
        return {
          file,
          riskLevel: "HIGH",
          reasons: [reason],
        };
      }
    }

    for (const { pattern, reason } of this.mediumRiskPatterns) {
      if (pattern.test(fileName)) {
        return {
          file,
          riskLevel: "MEDIUM",
          reasons: [reason],
        };
      }
    }

    for (const { pattern, reason } of this.lowRiskPatterns) {
      if (pattern.test(fileName)) {
        return {
          file,
          riskLevel: "LOW",
          reasons: [reason],
        };
      }
    }

    return {
      file,
      riskLevel: "MEDIUM",
      reasons: ["Standard code change"],
    };
  }

  assessFiles(files: string[]): FileImpact[] {
    return files.map((file) => this.assessFile(file));
  }

  calculateOverallRisk(files: string[]): RiskLevel {
    const impacts = this.assessFiles(files);

    const highCount = impacts.filter((i) => i.riskLevel === "HIGH").length;
    const mediumCount = impacts.filter((i) => i.riskLevel === "MEDIUM").length;
    const lowCount = impacts.filter((i) => i.riskLevel === "LOW").length;

    const total = impacts.length;

    if (total === 0) {
      return "LOW";
    }

    const highRatio = highCount / total;

    if (highRatio >= 0.2) {
      return "HIGH";
    }

    if (highRatio >= 0.1) {
      return "MEDIUM";
    }

    if (highCount > 0) {
      return "MEDIUM";
    }

    const mediumRatio = mediumCount / total;
    if (mediumRatio >= 0.5) {
      return "MEDIUM";
    }

    return "LOW";
  }

  calculateImpactScore(files: string[]): number {
    const impacts = this.assessFiles(files);

    const scores = impacts.map((impact) => {
      switch (impact.riskLevel) {
        case "HIGH":
          return 10;
        case "MEDIUM":
          return 5;
        case "LOW":
          return 1;
        default:
          return 5;
      }
    });

    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const maxPossibleScore = impacts.length * 10;

    if (maxPossibleScore === 0) {
      return 0;
    }

    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  getRiskSummary(files: string[]): {
    overall: RiskLevel;
    score: number;
    breakdown: {
      high: number;
      medium: number;
      low: number;
    };
    highRiskFiles: string[];
  } {
    const impacts = this.assessFiles(files);

    const highCount = impacts.filter((i) => i.riskLevel === "HIGH").length;
    const mediumCount = impacts.filter((i) => i.riskLevel === "MEDIUM").length;
    const lowCount = impacts.filter((i) => i.riskLevel === "LOW").length;

    return {
      overall: this.calculateOverallRisk(files),
      score: this.calculateImpactScore(files),
      breakdown: {
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      highRiskFiles: impacts.filter((i) => i.riskLevel === "HIGH").map((i) => i.file),
    };
  }
}
