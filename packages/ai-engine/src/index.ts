export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface Completion {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<Completion>;
  stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
}

export function createOpenAIProvider(_apiKey: string): LLMProvider {
  return {
    async complete() {
      return { text: "", usage: { inputTokens: 0, outputTokens: 0 } };
    },
    async *stream() {},
  };
}

export function createAnthropicProvider(_apiKey: string): LLMProvider {
  return {
    async complete() {
      return { text: "", usage: { inputTokens: 0, outputTokens: 0 } };
    },
    async *stream() {},
  };
}
