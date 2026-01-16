import { describe, expect, test } from "bun:test";
import {
  type Completion,
  type CompletionOptions,
  type LLMProvider,
  createAnthropicProvider,
  createLocalLLMProvider,
  createOpenAIProvider,
} from "./index.js";

describe("LLM Provider Interfaces", () => {
  test("CompletionOptions should allow optional fields", () => {
    const options: CompletionOptions = {};
    expect(options.model).toBeUndefined();
    expect(options.maxTokens).toBeUndefined();
    expect(options.temperature).toBeUndefined();
  });

  test("Completion should have correct structure", () => {
    const completion: Completion = {
      text: "Hello world",
      usage: { inputTokens: 10, outputTokens: 5 },
    };
    expect(completion.text).toBe("Hello world");
    expect(completion.usage.inputTokens).toBe(10);
    expect(completion.usage.outputTokens).toBe(5);
  });

  test("LLMProvider interface should require complete and stream methods", () => {
    const mockProvider: LLMProvider = {
      async complete() {
        return { text: "", usage: { inputTokens: 0, outputTokens: 0 } };
      },
      async *stream() {},
    };
    expect(typeof mockProvider.complete).toBe("function");
    expect(typeof mockProvider.stream).toBe("function");
  });
});

describe("createOpenAIProvider", () => {
  test("should return a provider object with complete and stream methods", () => {
    const provider = createOpenAIProvider("test-api-key");
    expect(provider).toHaveProperty("complete");
    expect(provider).toHaveProperty("stream");
    expect(typeof provider.complete).toBe("function");
    expect(typeof provider.stream).toBe("function");
  });
});

describe("createAnthropicProvider", () => {
  test("should return a provider object with complete and stream methods", () => {
    const provider = createAnthropicProvider("test-api-key");
    expect(provider).toHaveProperty("complete");
    expect(provider).toHaveProperty("stream");
    expect(typeof provider.complete).toBe("function");
    expect(typeof provider.stream).toBe("function");
  });
});

describe("createLocalLLMProvider", () => {
  test("should return a provider object with complete and stream methods", () => {
    const provider = createLocalLLMProvider("http://localhost:11434");
    expect(provider).toHaveProperty("complete");
    expect(provider).toHaveProperty("stream");
    expect(typeof provider.complete).toBe("function");
    expect(typeof provider.stream).toBe("function");
  });
});
