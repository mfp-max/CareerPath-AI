import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { APICallError, generateObject, RetryError, type LanguageModelV1 } from "ai";
import type { z } from "zod";

/** Treats unset values and `.env.example` placeholders ("your_..._here") as missing. */
function envKey(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && !value.startsWith("your_")) return value;
  }
  return undefined;
}

// Free-tier Gemini models are often rate limited or overloaded, and older model IDs get
// retired for new users, so several candidates are tried in order.
const GEMINI_DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
];

/**
 * Candidate models from the available API keys, in provider order: Anthropic, OpenAI,
 * Google Gemini. AI_MODEL (if set) is tried first for the chosen provider.
 */
export function getAIModels(): { id: string; model: LanguageModelV1 }[] {
  const override = process.env.AI_MODEL?.trim() || undefined;
  const withOverride = (defaults: string[]) =>
    Array.from(new Set(override ? [override, ...defaults] : defaults));

  if (envKey("ANTHROPIC_API_KEY")) {
    return withOverride(["claude-sonnet-5-5"]).map((id) => ({ id, model: anthropic(id) }));
  }
  if (envKey("OPENAI_API_KEY")) {
    return withOverride(["gpt-4o"]).map((id) => ({ id, model: openai(id) }));
  }

  // Gemini through its OpenAI-compatible endpoint, so no extra SDK package is needed.
  const geminiKey = envKey("GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY");
  if (geminiKey) {
    const gemini = createOpenAI({
      name: "gemini",
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      compatibility: "compatible",
    });
    return withOverride(GEMINI_DEFAULT_MODELS).map((id) => ({ id, model: gemini.chat(id) }));
  }

  return [];
}

export function isAIConfigured() {
  return getAIModels().length > 0;
}

/** Errors worth retrying on another model: rate limit, overload, or unknown/retired model. */
export function isAIBusyError(error: unknown): boolean {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  return (
    APICallError.isInstance(cause) && [404, 429, 500, 503].includes(cause.statusCode ?? 0)
  );
}

let lastWorkingModel: string | null = null;

/** `generateObject` that falls back to the next candidate model when one is unavailable. */
export async function generateAIObject<T>(options: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const models = getAIModels();
  if (models.length === 0) throw new Error("AI provider not configured");

  // Start with the model that last worked, so busy models aren't retried on every request.
  const ordered = [
    ...models.filter((m) => m.id === lastWorkingModel),
    ...models.filter((m) => m.id !== lastWorkingModel),
  ];

  let lastError: unknown;
  for (const { id, model } of ordered) {
    try {
      // No same-model retries: moving to the next candidate is faster when a model is busy.
      const { object } = await generateObject({ model, maxRetries: 0, ...options });
      lastWorkingModel = id;
      return object;
    } catch (error) {
      lastError = error;
      if (!isAIBusyError(error)) throw error;
      console.warn(`AI model "${id}" unavailable, trying next model.`);
      if (lastWorkingModel === id) lastWorkingModel = null;
    }
  }
  throw lastError;
}
