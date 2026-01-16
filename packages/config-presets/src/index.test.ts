import { describe, expect, test } from "bun:test";
import {
  type PromptTemplate,
  getAllTemplates,
  getTemplate,
  resolveTemplateName,
  templateExists,
  templates,
} from "./index.js";

describe("PromptTemplate Interfaces", () => {
  test("PromptTemplate should have correct structure", () => {
    const template: PromptTemplate = {
      name: "Test",
      description: "A test template",
      template: "Hello {{name}}",
    };
    expect(template.name).toBe("Test");
    expect(template.description).toBe("A test template");
    expect(template.template).toContain("{{name}}");
  });

  test("PromptTemplate can have optional systemPrompt", () => {
    const template: PromptTemplate = {
      name: "Test",
      description: "A test template",
      template: "Hello",
      systemPrompt: "You are helpful",
    };
    expect(template.systemPrompt).toBe("You are helpful");
  });
});

describe("templates object", () => {
  test("should have all required templates", () => {
    expect(templates).toHaveProperty("securityFocused");
    expect(templates).toHaveProperty("concise");
    expect(templates).toHaveProperty("verbose");
    expect(templates).toHaveProperty("default");
  });

  test("securityFocused should have security content", () => {
    const template = templates.securityFocused as PromptTemplate;
    expect(template.name).toBe("Security Focused");
    expect(template.description).toContain("security");
    expect(template.template).toContain("Security Analysis");
  });

  test("concise should have brief content", () => {
    const template = templates.concise as PromptTemplate;
    expect(template.name).toBe("Concise");
    expect(template.description).toContain("Brief");
    expect(template.template).toContain("TL;DR");
  });

  test("verbose should have detailed content", () => {
    const template = templates.verbose as PromptTemplate;
    expect(template.name).toBe("Verbose");
    expect(template.description).toContain("Detailed");
    expect(template.template).toContain("Detailed PR Analysis");
  });
});

describe("getTemplate", () => {
  test("should return securityFocused for 'security'", () => {
    const template = getTemplate("security");
    expect(template.name).toBe("Security Focused");
  });

  test("should return securityFocused for 'security-focused'", () => {
    const template = getTemplate("security-focused");
    expect(template.name).toBe("Security Focused");
  });

  test("should return concise for 'concise'", () => {
    const template = getTemplate("concise");
    expect(template.name).toBe("Concise");
  });

  test("should return concise for 'brief'", () => {
    const template = getTemplate("brief");
    expect(template.name).toBe("Concise");
  });

  test("should return verbose for 'verbose'", () => {
    const template = getTemplate("verbose");
    expect(template.name).toBe("Verbose");
  });

  test("should return verbose for 'detailed'", () => {
    const template = getTemplate("detailed");
    expect(template.name).toBe("Verbose");
  });

  test("should return default for unknown template", () => {
    const template = getTemplate("unknown-template");
    expect(template.name).toBe("Default");
  });

  test("should return default for empty string", () => {
    const template = getTemplate("");
    expect(template.name).toBe("Default");
  });
});

describe("getAllTemplates", () => {
  test("should return array of all templates", () => {
    const all = getAllTemplates();
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(4);
  });

  test("should include all template types", () => {
    const all = getAllTemplates();
    const names = all.map((t) => t.name);
    expect(names).toContain("Security Focused");
    expect(names).toContain("Concise");
    expect(names).toContain("Verbose");
    expect(names).toContain("Default");
  });
});

describe("templateExists", () => {
  test("should return true for existing templates", () => {
    expect(templateExists("security")).toBe(true);
    expect(templateExists("concise")).toBe(true);
    expect(templateExists("verbose")).toBe(true);
  });

  test("should return true for unknown templates (they resolve to default)", () => {
    expect(templateExists("nonexistent")).toBe(true);
    expect(templateExists("custom")).toBe(true);
  });
});

describe("resolveTemplateName", () => {
  test("should resolve security variants", () => {
    expect(resolveTemplateName("security")).toBe("securityFocused");
    expect(resolveTemplateName("security-focused")).toBe("securityFocused");
    expect(resolveTemplateName("SecurityFocused")).toBe("securityFocused");
  });

  test("should resolve concise variants", () => {
    expect(resolveTemplateName("concise")).toBe("concise");
    expect(resolveTemplateName("brief")).toBe("concise");
    expect(resolveTemplateName("short")).toBe("concise");
  });

  test("should resolve verbose variants", () => {
    expect(resolveTemplateName("verbose")).toBe("verbose");
    expect(resolveTemplateName("detailed")).toBe("verbose");
    expect(resolveTemplateName("full")).toBe("verbose");
  });

  test("should resolve default for unknown", () => {
    expect(resolveTemplateName("unknown")).toBe("default");
    expect(resolveTemplateName("custom")).toBe("default");
  });
});
