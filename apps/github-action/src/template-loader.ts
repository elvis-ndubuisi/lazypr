import * as core from "@actions/core";
import type { Octokit } from "@octokit/rest";

const CUSTOM_TEMPLATE_PATHS = [
  ".github/lazypr-template.md",
  ".lazypr/template.md",
  "lazypr-template.md",
];

export async function loadCustomTemplate(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string | null> {
  for (const templatePath of CUSTOM_TEMPLATE_PATHS) {
    try {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: templatePath,
      });

      if (Array.isArray(response.data)) {
        continue;
      }

      if (response.data.type === "file" && "content" in response.data) {
        const content = Buffer.from(response.data.content, "base64").toString("utf-8");
        return content;
      }
    } catch (error) {
      const octokitError = error as { status?: number };
      if (octokitError.status !== 404) {
        core.warning(`Failed to load template from ${templatePath}: ${error}`);
      }
    }
  }

  return null;
}

export function isCustomTemplateValid(template: string): boolean {
  if (!template || template.trim().length === 0) {
    return false;
  }

  const requiredPlaceholders = ["{{diff}}", "{{filesChanged}}"];
  const hasRequired = requiredPlaceholders.some((placeholder) => template.includes(placeholder));

  return hasRequired;
}

export function sanitizeTemplate(template: string): string {
  let sanitized = template;

  sanitized = sanitized.replace(/\{\{prTitle\}\}/g, "{{prTitle}}");
  sanitized = sanitized.replace(/\{\{prBody\}\}/g, "{{prBody}}");
  sanitized = sanitized.replace(/\{\{prAuthor\}\}/g, "{{prAuthor}}");
  sanitized = sanitized.replace(/\{\{diff\}\}/g, "{{diff}}");
  sanitized = sanitized.replace(/\{\{filesChanged\}\}/g, "{{filesChanged}}");
  sanitized = sanitized.replace(/\{\{riskLevel\}\}/g, "{{riskLevel}}");
  sanitized = sanitized.replace(/\{\{riskScore\}\}/g, "{{riskScore}}");
  sanitized = sanitized.replace(/\{\{highRiskFiles\}\}/g, "{{highRiskFiles}}");
  sanitized = sanitized.replace(/\{\{fileBreakdown\}\}/g, "{{fileBreakdown}}");

  return sanitized;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTemplate(template: string): TemplateValidationResult {
  const result: TemplateValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!template || template.trim().length === 0) {
    result.valid = false;
    result.errors.push("Template is empty");
    return result;
  }

  const requiredPlaceholders = ["{{diff}}", "{{filesChanged}}"];
  for (const placeholder of requiredPlaceholders) {
    if (!template.includes(placeholder)) {
      result.errors.push(`Missing required placeholder: ${placeholder}`);
      result.valid = false;
    }
  }

  const optionalPlaceholders = [
    "{{prTitle}}",
    "{{prBody}}",
    "{{prAuthor}}",
    "{{riskLevel}}",
    "{{riskScore}}",
    "{{highRiskFiles}}",
    "{{fileBreakdown}}",
  ];
  for (const placeholder of optionalPlaceholders) {
    if (template.includes(placeholder)) {
      result.warnings.push(`Optional placeholder used: ${placeholder}`);
    }
  }

  const maxLength = 10000;
  if (template.length > maxLength) {
    result.warnings.push(`Template is ${template.length} characters, exceeding ${maxLength} limit`);
  }

  return result;
}
