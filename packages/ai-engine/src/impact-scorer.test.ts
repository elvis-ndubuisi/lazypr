import { describe, expect, test } from "bun:test";
import { ImpactScorer } from "./impact-scorer.js";

describe("ImpactScorer", () => {
  describe("assessFile", () => {
    test("should identify HIGH risk auth files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("src/auth/login.ts");

      expect(result.riskLevel).toBe("HIGH");
      expect(result.reasons).toContain("Login handling");
    });

    test("should identify HIGH risk schema files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("db.schema.ts");

      expect(result.riskLevel).toBe("HIGH");
      expect(result.reasons).toContain("Database schema");
    });

    test("should identify HIGH risk permission files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("roles.ts");

      expect(result.riskLevel).toBe("HIGH");
      expect(result.reasons).toContain("Role-based access");
    });

    test("should identify HIGH risk secret files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("src/utils/handleApikey.ts");

      expect(result.riskLevel).toBe("HIGH");
      expect(result.reasons).toContain("API key handling");
    });

    test("should identify MEDIUM risk controller files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("user.controller.ts");

      expect(result.riskLevel).toBe("MEDIUM");
      expect(result.reasons).toContain("API controller");
    });

    test("should identify MEDIUM risk service files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("payment.service.ts");

      expect(result.riskLevel).toBe("MEDIUM");
      expect(result.reasons).toContain("Business logic");
    });

    test("should identify LOW risk test files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("src/auth/login.test.ts");

      expect(result.riskLevel).toBe("LOW");
      expect(result.reasons).toContain("Test file");
    });

    test("should identify LOW risk config files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("config/settings.json");

      expect(result.riskLevel).toBe("LOW");
      expect(result.reasons).toContain("JSON config (low risk)");
    });

    test("should default to MEDIUM for unknown files", () => {
      const scorer = new ImpactScorer();
      const result = scorer.assessFile("src/utils/helpers.ts");

      expect(result.riskLevel).toBe("MEDIUM");
      expect(result.reasons).toContain("Standard code change");
    });
  });

  describe("assessFiles", () => {
    test("should assess multiple files", () => {
      const scorer = new ImpactScorer();
      const results = scorer.assessFiles([
        "src/auth/login.ts",
        "src/controllers/user.ts",
        "src/utils/helpers.ts",
      ]);

      expect(results).toHaveLength(3);
      const first = results[0];
      const second = results[1];
      const third = results[2];
      expect(first?.riskLevel).toBe("HIGH");
      expect(second?.riskLevel).toBe("MEDIUM");
      expect(third?.riskLevel).toBe("MEDIUM");
    });
  });

  describe("calculateOverallRisk", () => {
    test("should return HIGH when 20% of files are high risk", () => {
      const scorer = new ImpactScorer();
      const files = ["login.ts", "helpers.ts", "helpers2.ts", "helpers3.ts", "helpers4.ts"];

      const risk = scorer.calculateOverallRisk(files);

      expect(risk).toBe("HIGH");
    });

    test("should return MEDIUM when some medium risk files", () => {
      const scorer = new ImpactScorer();
      const files = ["user.controller.ts", "user2.controller.ts", "helpers.ts"];

      const risk = scorer.calculateOverallRisk(files);

      expect(risk).toBe("MEDIUM");
    });

    test("should return LOW for test and config files only", () => {
      const scorer = new ImpactScorer();
      const files = ["src/utils/helpers.test.ts", "config/settings.json"];

      const risk = scorer.calculateOverallRisk(files);

      expect(risk).toBe("LOW");
    });

    test("should return HIGH for mixed risk with high risk file", () => {
      const scorer = new ImpactScorer();
      const files = [
        "src/auth/login.ts",
        "src/controllers/user.ts",
        "src/utils/helpers.ts",
        "src/utils/helpers2.ts",
        "src/utils/helpers3.ts",
      ];

      const risk = scorer.calculateOverallRisk(files);

      expect(risk).toBe("HIGH");
    });

    test("should return LOW for empty files array", () => {
      const scorer = new ImpactScorer();
      const risk = scorer.calculateOverallRisk([]);

      expect(risk).toBe("LOW");
    });
  });

  describe("calculateImpactScore", () => {
    test("should return 100 for all high risk files", () => {
      const scorer = new ImpactScorer();
      const files = ["src/auth/login.ts", "src/permission/roles.ts"];

      const score = scorer.calculateImpactScore(files);

      expect(score).toBe(100);
    });

    test("should return 0 for empty files", () => {
      const scorer = new ImpactScorer();
      const score = scorer.calculateImpactScore([]);

      expect(score).toBe(0);
    });

    test("should return medium score for mixed files", () => {
      const scorer = new ImpactScorer();
      const files = ["src/auth/login.ts", "src/utils/helpers.ts"];

      const score = scorer.calculateImpactScore(files);

      expect(score).toBe(75);
    });
  });

  describe("getRiskSummary", () => {
    test("should return complete risk summary", () => {
      const scorer = new ImpactScorer();
      const summary = scorer.getRiskSummary([
        "src/auth/login.ts",
        "src/controllers/user.ts",
        "src/utils/helpers.ts",
      ]);

      expect(summary).toHaveProperty("overall");
      expect(summary).toHaveProperty("score");
      expect(summary).toHaveProperty("breakdown");
      expect(summary).toHaveProperty("highRiskFiles");
      expect(summary.breakdown).toEqual({ high: 1, medium: 2, low: 0 });
      expect(summary.highRiskFiles).toContain("src/auth/login.ts");
    });
  });

  describe("custom patterns", () => {
    test("should support custom high risk patterns", () => {
      const scorer = new ImpactScorer({
        customPatterns: [
          {
            pattern: /custom-file\.js$/i,
            riskLevel: "HIGH",
            reason: "Custom high risk",
          },
        ],
      });

      const result = scorer.assessFile("src/custom-file.js");

      expect(result.riskLevel).toBe("HIGH");
      expect(result.reasons).toContain("Custom high risk");
    });
  });
});
