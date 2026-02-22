import { type LLMProviderType, createLangChainProvider } from "./langchain-provider.js";

export interface TitleEvaluationOptions {
  provider: LLMProviderType;
  apiKey: string;
  model: string;
  ticketRef?: string;
}

export interface TitleEvaluationResult {
  isVague: boolean;
  suggestedTitle?: string;
  reason: string;
}

const TITLE_EVALUATION_PROMPT = `You are a PR title quality evaluator.

Current PR title: "{{title}}"
Detected ticket: {{ticketRef}}

Changed files (max 5):
{{files}}

Rules:
1. Titles must be SHORT (5-10 words max) and DESCRIPTIVE
2. DO NOT summarize the entire PR - that's what the PR body is for
3. Good examples:
   - "Add JWT authentication to login flow"
   - "Fix null pointer in payment processor"
   - "PROJ-123: Update user profile validation"
4. Bad examples:
   - "This PR implements JWT-based authentication with refresh tokens..." (too long)
   - "feat/auth-integration" (branch name, not title)
   - "fixes" (too vague)
5. If ticket detected, include it: "PROJ-123: <descriptive title>"

Evaluate the current title. Respond ONLY with valid JSON (no markdown, no code blocks):
{"isVague":boolean,"suggestedTitle":"short title if vague, null if good","reason":"one sentence"}`;

function getDefaultModel(provider: LLMProviderType): string {
  switch (provider) {
    case "gemini":
      return "gemini-2.5-flash";
    case "anthropic":
      return "claude-sonnet-4-20250514";
    default:
      return "gpt-4-turbo";
  }
}

export async function evaluatePRTitle(
  title: string,
  files: string[],
  options: TitleEvaluationOptions,
): Promise<TitleEvaluationResult> {
  const { provider: providerType, apiKey, model, ticketRef } = options;

  const provider = createLangChainProvider({
    provider: providerType,
    apiKey,
    model: model || getDefaultModel(providerType),
  });

  const fileList = files
    .slice(0, 5)
    .map((f) => `- ${f}`)
    .join("\n");
  const ticketDisplay = ticketRef || "none";

  const prompt = TITLE_EVALUATION_PROMPT.replace("{{title}}", title)
    .replace("{{ticketRef}}", ticketDisplay)
    .replace("{{files}}", fileList || "No files detected");

  try {
    const completion = await provider.complete(prompt, {
      model: model || getDefaultModel(providerType),
      temperature: 0.3,
      maxTokens: 100,
    });

    const responseText = completion.text.trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isVague: false,
        reason: "AI response was not valid JSON, keeping title",
      };
    }

    const response = JSON.parse(jsonMatch[0]);

    return {
      isVague: response.isVague ?? false,
      suggestedTitle: response.suggestedTitle || undefined,
      reason: response.reason || "No reason provided",
    };
  } catch (error) {
    return {
      isVague: false,
      reason: `AI evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
