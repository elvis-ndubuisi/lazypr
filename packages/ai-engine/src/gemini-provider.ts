import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Options for Gemini completion requests.
 */
export interface CompletionOptions {
  /** The Gemini model to use (e.g., "gemini-2.5-flash", "gemini-1.5-pro") */
  model?: string;
  /** Maximum number of tokens in the response */
  maxTokens?: number;
  /** Temperature for sampling (0-1, lower = more focused) */
  temperature?: number;
  /** System prompt to set the model's behavior */
  systemPrompt?: string;
}

/**
 * Represents the result of a Gemini completion request.
 */
export interface Completion {
  /** The generated text response */
  text: string;
  /** Token usage statistics */
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Interface for Gemini LLM providers.
 */
export interface LLMProvider {
  /**
   * Generates a non-streaming text completion.
   * @param prompt - The user prompt to send to Gemini
   * @param options - Optional completion settings
   * @returns Promise resolving to the completion result
   */
  complete(prompt: string, options?: CompletionOptions): Promise<Completion>;
  /**
   * Generates a streaming text completion.
   * @param prompt - The user prompt to send to Gemini
   * @param options - Optional completion settings
   * @returns Async iterable of text chunks
   */
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

interface GeminiResponse {
  text(): string;
  usageMetadata?: GeminiUsageMetadata;
}

/**
 * Creates a Gemini 2.5 Flash provider for text completions.
 *
 * Gemini 2.5 Flash features a 1M token context window, making it ideal
 * for analyzing large diffs without truncation.
 *
 * @param apiKey - Google AI API key (uses GEMINI_API_KEY env var if not provided)
 * @returns An LLMProvider instance configured for Gemini 2.5 Flash
 *
 * @example
 * ```typescript
 * const provider = createGeminiProvider(process.env.GEMINI_API_KEY);
 * const result = await provider.complete("Summarize this PR...");
 * ```
 */
export function createGeminiProvider(apiKey: string): LLMProvider {
  const client = new GoogleGenerativeAI(apiKey);

  return {
    async complete(prompt, options) {
      const modelName = options?.model ?? "gemini-2.5-flash";
      const model = client.getGenerativeModel({ model: modelName });

      const generationConfig = {
        maxOutputTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
      };

      const contents = [
        ...(options?.systemPrompt
          ? [{ role: "model" as const, parts: [{ text: options.systemPrompt }] }]
          : []),
        { role: "user" as const, parts: [{ text: prompt }] },
      ];

      const response = await model.generateContent({
        contents,
        generationConfig,
      });

      const result: GeminiResponse = response.response;
      const text = result.text() ?? "";

      const usageMetadata = result.usageMetadata ?? {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
      };

      return {
        text,
        usage: {
          inputTokens: usageMetadata.promptTokenCount ?? 0,
          outputTokens: usageMetadata.candidatesTokenCount ?? 0,
        },
      };
    },

    async *stream(prompt, options) {
      const modelName = options?.model ?? "gemini-2.5-flash";
      const model = client.getGenerativeModel({ model: modelName });

      const generationConfig = {
        maxOutputTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
      };

      const contents = [
        ...(options?.systemPrompt
          ? [{ role: "model" as const, parts: [{ text: options.systemPrompt }] }]
          : []),
        { role: "user" as const, parts: [{ text: prompt }] },
      ];

      const result = await model.generateContentStream({
        contents,
        generationConfig,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    },
  };
}

/**
 * Creates a Gemini 1.5 Pro provider for text completions.
 *
 * Gemini 1.5 Pro offers higher quality outputs with a 2M token context window,
 * suitable for complex summarization tasks.
 *
 * @param apiKey - Google AI API key (uses GEMINI_API_KEY env var if not provided)
 * @returns An LLMProvider instance configured for Gemini 1.5 Pro
 *
 * @example
 * ```typescript
 * const provider = createGeminiProProvider(process.env.GEMINI_API_KEY);
 * const result = await provider.complete("Analyze this complex PR...");
 * ```
 */
export function createGeminiProProvider(apiKey: string): LLMProvider {
  const client = new GoogleGenerativeAI(apiKey);

  return {
    async complete(prompt, options) {
      const model = client.getGenerativeModel({
        model: options?.model ?? "gemini-1.5-pro",
      });

      const generationConfig = {
        maxOutputTokens: options?.maxTokens ?? 8192,
        temperature: options?.temperature ?? 0.3,
      };

      const contents = [
        ...(options?.systemPrompt
          ? [{ role: "model" as const, parts: [{ text: options.systemPrompt }] }]
          : []),
        { role: "user" as const, parts: [{ text: prompt }] },
      ];

      const response = await model.generateContent({
        contents,
        generationConfig,
      });

      const result: GeminiResponse = response.response;
      const text = result.text() ?? "";

      const usageMetadata = result.usageMetadata ?? {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
      };

      return {
        text,
        usage: {
          inputTokens: usageMetadata.promptTokenCount ?? 0,
          outputTokens: usageMetadata.candidatesTokenCount ?? 0,
        },
      };
    },

    async *stream(prompt, options) {
      const model = client.getGenerativeModel({
        model: options?.model ?? "gemini-1.5-pro",
      });

      const generationConfig = {
        maxOutputTokens: options?.maxTokens ?? 8192,
        temperature: options?.temperature ?? 0.3,
      };

      const contents = [
        ...(options?.systemPrompt
          ? [{ role: "model" as const, parts: [{ text: options.systemPrompt }] }]
          : []),
        { role: "user" as const, parts: [{ text: prompt }] },
      ];

      const result = await model.generateContentStream({
        contents,
        generationConfig,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    },
  };
}
