import OpenAI from "openai";

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
