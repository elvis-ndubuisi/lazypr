import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

export type LLMProviderType = "gemini" | "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProviderType;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

function getEnvProvider(): LLMProviderType {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  if (provider === "gemini" || provider === "openai" || provider === "anthropic") {
    return provider;
  }
  return "gemini";
}

function getEnvApiKey(provider: LLMProviderType): string | undefined {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

export function createLLM(config?: Partial<LLMConfig>) {
  const provider = config?.provider ?? getEnvProvider();
  const apiKey = config?.apiKey ?? getEnvApiKey(provider);
  const model = config?.model ?? getDefaultModel(provider);
  const maxTokens = config?.maxTokens ?? 4096;
  const temperature = config?.temperature ?? 0.3;

  switch (provider) {
    case "gemini":
      return createGeminiLLM({ model, apiKey, maxTokens, temperature });
    case "openai":
      return createOpenAILLM({ model, apiKey, maxTokens, temperature });
    case "anthropic":
      return createAnthropicLLM({ model, apiKey, maxTokens, temperature });
    default:
      return createGeminiLLM({ model, apiKey, maxTokens, temperature });
  }
}

function getDefaultModel(provider: LLMProviderType): string {
  switch (provider) {
    case "gemini":
      return "gemini-2.5-flash";
    case "openai":
      return "gpt-4-turbo";
    case "anthropic":
      return "claude-sonnet-4-20250514";
    default:
      return "gemini-2.5-flash";
  }
}

interface LLMOptions {
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
}

function createGeminiLLM(options: LLMOptions) {
  if (!options.apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required for Gemini provider");
  }

  return new ChatGoogleGenerativeAI({
    model: options.model,
    apiKey: options.apiKey,
    maxOutputTokens: options.maxTokens,
    temperature: options.temperature,
  });
}

function createOpenAILLM(options: LLMOptions) {
  if (!options.apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required for OpenAI provider");
  }

  return new ChatOpenAI({
    model: options.model,
    apiKey: options.apiKey,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });
}

function createAnthropicLLM(options: LLMOptions) {
  if (!options.apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required for Anthropic provider");
  }

  return new ChatOpenAI({
    model: options.model,
    apiKey: options.apiKey,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    configuration: {
      baseURL: "https://api.anthropic.com/v1",
    },
  });
}

export function getProviderInfo(provider: LLMProviderType) {
  switch (provider) {
    case "gemini":
      return {
        name: "Google Gemini",
        model: "gemini-2.5-flash",
        contextWindow: "1M tokens",
        strengths: ["Large context window", "Fast inference", "Cost-effective"],
      };
    case "openai":
      return {
        name: "OpenAI GPT-4",
        model: "gpt-4-turbo",
        contextWindow: "128K tokens",
        strengths: ["High quality", "Well-tested", "Wide adoption"],
      };
    case "anthropic":
      return {
        name: "Anthropic Claude",
        model: "claude-sonnet-4-20250514",
        contextWindow: "200K tokens",
        strengths: ["Long context", "Helpful", "Safety-aligned"],
      };
    default:
      return {
        name: "Unknown",
        model: "unknown",
        contextWindow: "unknown",
        strengths: [],
      };
  }
}
