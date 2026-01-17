import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createLLM } from "./llm-factory.js";
import type { LLMConfig } from "./llm-factory.js";

export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface Completion {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<Completion>;
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          return "text" in item
            ? String((item as { text?: unknown }).text ?? "")
            : JSON.stringify(item);
        }
        return String(item);
      })
      .join("");
  }
  if (typeof content === "object") {
    if ("text" in content) {
      return String((content as { text?: unknown }).text ?? "");
    }
    return JSON.stringify(content);
  }
  return String(content);
}

export function createLangChainProvider(config?: Partial<LLMConfig>): LLMProvider {
  const llm = createLLM(config);

  return {
    async complete(prompt: string, options?: CompletionOptions): Promise<Completion> {
      const messages: Array<{ role: "user" | "system"; content: string }> = [];

      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const inputTokens = countTokens(prompt + (options?.systemPrompt ?? ""));

      const invokeOptions: Record<string, unknown> = {
        maxTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
      };

      const response = await llm.invoke(messages, invokeOptions);
      const outputText = extractTextContent(response.content);
      const outputTokens = countTokens(outputText);

      return {
        text: outputText,
        usage: {
          inputTokens,
          outputTokens,
        },
      };
    },

    async *stream(prompt: string, options?: CompletionOptions): AsyncIterable<string> {
      const messages: Array<{ role: "user" | "system"; content: string }> = [];

      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const invokeOptions: Record<string, unknown> = {
        maxTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
      };

      const stream = await llm.stream(messages, invokeOptions);

      for await (const chunk of stream) {
        const chunkContent = extractTextContent(chunk.content);
        if (chunkContent) {
          yield chunkContent;
        }
      }
    },
  };
}

export { createLLM, getProviderInfo, type LLMProviderType } from "./llm-factory.js";
