/**
 * AI Engine for lazypr - LLM provider abstraction layer.
 *
 * This package provides a unified interface for interacting with various LLM providers
 * (OpenAI, Anthropic, Google Gemini) using LangChain.js for abstraction.
 *
 * @example
 * ```typescript
 * import { createLangChainProvider, createLLM, getProviderInfo } from "@lazypr/ai-engine";
 *
 * // Factory approach (recommended)
 * const provider = createLangChainProvider({
 *   provider: "gemini",
 *   apiKey: process.env.GEMINI_API_KEY,
 *   model: "gemini-2.5-flash"
 * });
 *
 * const result = await provider.complete("Summarize this PR...");
 * ```
 */

import OpenAI from "openai";

export type { LLMProviderType } from "./llm-factory.js";

/**
 * Options for LLM completion requests.
 */
export interface CompletionOptions {
  /** The model to use for completion (e.g., "gpt-4-turbo", "gemini-2.5-flash") */
  model?: string;
  /** Maximum number of tokens in the response */
  maxTokens?: number;
  /** Temperature for sampling (0-1, lower = more focused) */
  temperature?: number;
  /** System prompt to set the LLM's behavior */
  systemPrompt?: string;
}

/**
 * Represents the result of an LLM completion request.
 */
export interface Completion {
  /** The generated text response */
  text: string;
  /** Token usage statistics */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Interface for LLM providers that can generate text completions.
 *
 * @example
 * ```typescript
 * const provider = createLangChainProvider({ provider: "openai" });
 * const result = await provider.complete("Summarize this PR...");
 * console.log(result.text);
 * ```
 */
export interface LLMProvider {
  /**
   * Generates a non-streaming text completion.
   *
   * @param prompt - The user prompt to send to the LLM
   * @param options - Optional completion settings
   * @returns Promise resolving to the completion result
   */
  complete(prompt: string, options?: CompletionOptions): Promise<Completion>;
  /**
   * Generates a streaming text completion.
   *
   * @param prompt - The user prompt to send to the LLM
   * @param options - Optional completion settings
   * @returns Async iterable of text chunks
   */
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
}

/**
 * Creates an OpenAI provider for text completions using direct SDK.
 *
 * @param apiKey - OpenAI API key (uses OPENAI_API_KEY env var if not provided)
 * @returns An LLMProvider instance configured for OpenAI
 *
 * @example
 * ```typescript
 * const provider = createOpenAIProvider(process.env.OPENAI_API_KEY);
 * const result = await provider.complete("Hello, world!");
 * ```
 * @deprecated Use createLangChainProvider with provider: "openai" instead
 */
export function createOpenAIProvider(apiKey: string): LLMProvider {
  const client = new OpenAI({ apiKey });

  return {
    async complete(prompt, options) {
      const response = await client.chat.completions.create({
        model: options?.model ?? "gpt-4-turbo",
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const choice = response.choices[0];
      const message = choice?.message?.content ?? "";

      return {
        text: message,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },

    async *stream(prompt, options) {
      const response = await client.chat.completions.create({
        model: options?.model ?? "gpt-4-turbo",
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    },
  };
}

/**
 * Creates an Anthropic provider for text completions using direct SDK.
 *
 * Uses Anthropic's Claude models via their API compatibility layer.
 *
 * @param apiKey - Anthropic API key (uses ANTHROPIC_API_KEY env var if not provided)
 * @returns An LLMProvider instance configured for Anthropic
 *
 * @example
 * ```typescript
 * const provider = createAnthropicProvider(process.env.ANTHROPIC_API_KEY);
 * const result = await provider.complete("Summarize this PR...");
 * ```
 * @deprecated Use createLangChainProvider with provider: "anthropic" instead
 */
export function createAnthropicProvider(apiKey: string): LLMProvider {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.anthropic.com/v1",
    defaultHeaders: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  return {
    async complete(prompt, options) {
      const response = await client.chat.completions.create({
        model: options?.model ?? "claude-3-5-sonnet-20241022",
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const choice = response.choices[0];
      const message = choice?.message?.content ?? "";

      return {
        text: message,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },

    async *stream(prompt, options) {
      const response = await client.chat.completions.create({
        model: options?.model ?? "claude-3-5-sonnet-20241022",
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    },
  };
}

/**
 * Creates a local LLM provider for self-hosted models.
 *
 * Connects to locally running LLMs that expose an OpenAI-compatible API.
 *
 * @param baseUrl - The base URL of the local LLM server
 * @returns An LLMProvider instance configured for the local model
 *
 * @example
 * ```typescript
 * const provider = createLocalLLMProvider("http://localhost:11434/v1");
 * const result = await provider.complete("Hello, local model!");
 * ```
 */
export function createLocalLLMProvider(baseUrl: string): LLMProvider {
  const client = new OpenAI({ apiKey: "not-needed", baseURL: baseUrl });

  return {
    async complete(prompt, options) {
      const response = await client.chat.completions.create({
        model: options?.model ?? "llama3",
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
      });

      const choice = response.choices[0];
      const message = choice?.message?.content ?? "";

      return {
        text: message,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },

    async *stream(prompt, options) {
      const response = await client.chat.completions.create({
        model: options?.model ?? "llama3",
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        stream: true,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    },
  };
}

export * from "./types.js";
export * from "./impact-scorer.js";
export * from "./summarizer.js";
export * from "./checklist-generator.js";
export * from "./title-evaluator.js";
export { createLangChainProvider, createLLM, getProviderInfo } from "./langchain-provider.js";
export { createGeminiProvider, createGeminiProProvider } from "./gemini-provider.js";
export { generatePRSummarForGemini, createGeminiFlashProvider } from "./gemini-summarizer.js";
