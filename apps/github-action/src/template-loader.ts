import * as core from "@actions/core";
import type { OctokitClient } from "./octokit-types.js";

const CUSTOM_TEMPLATE_PATHS = [
  ".github/lazypr-template.md",
  ".lazypr/template.md",
  "lazypr-template.md",
];

export async function loadCustomTemplate(
  octokit: OctokitClient,
  owner: string,
  repo: string,
  customTemplatePath?: string,
): Promise<string | null> {
  const pathsToTry = [
    ...(customTemplatePath ? [customTemplatePath] : []),
    ...CUSTOM_TEMPLATE_PATHS,
  ];

  const seen = new Set<string>();
  for (const templatePath of pathsToTry) {
    if (seen.has(templatePath)) {
      continue;
    }
    seen.add(templatePath);

    try {
      const response = await octokit.rest.repos.getContent({
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
  sanitized = sanitized.replace(/\{\{relatedTickets\}\}/g, "{{relatedTickets}}");
  sanitized = sanitized.replace(/\{\{prSizeLines\}\}/g, "{{prSizeLines}}");
  sanitized = sanitized.replace(/\{\{prSizeFiles\}\}/g, "{{prSizeFiles}}");
  sanitized = sanitized.replace(/\{\{prSizeAdditions\}\}/g, "{{prSizeAdditions}}");
  sanitized = sanitized.replace(/\{\{prSizeDeletions\}\}/g, "{{prSizeDeletions}}");
  sanitized = sanitized.replace(/\{\{prSizeMetrics\}\}/g, "{{prSizeMetrics}}");

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
    "{{relatedTickets}}",
    "{{prSizeLines}}",
    "{{prSizeFiles}}",
    "{{prSizeAdditions}}",
    "{{prSizeDeletions}}",
    "{{prSizeMetrics}}",
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
