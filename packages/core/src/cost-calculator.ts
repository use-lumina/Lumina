/**
 * Cost Calculator for LLM API calls
 * Pricing as of Dec 2024 - update regularly
 */

interface ModelPricing {
  inputPer1M: number; // Cost per 1M input tokens in USD
  outputPer1M: number; // Cost per 1M output tokens in USD
}

// Pricing database for major models
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4-turbo': { inputPer1M: 10.0, outputPer1M: 30.0 },
  'gpt-4-turbo-2024-04-09': { inputPer1M: 10.0, outputPer1M: 30.0 },
  'gpt-4': { inputPer1M: 30.0, outputPer1M: 60.0 },
  'gpt-4-32k': { inputPer1M: 60.0, outputPer1M: 120.0 },
  'gpt-3.5-turbo': { inputPer1M: 0.5, outputPer1M: 1.5 },
  'gpt-3.5-turbo-16k': { inputPer1M: 3.0, outputPer1M: 4.0 },
  'gpt-4o': { inputPer1M: 5.0, outputPer1M: 15.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },

  // Anthropic Claude
  'claude-3-opus-20240229': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-3-sonnet-20240229': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-3-haiku-20240307': { inputPer1M: 0.25, outputPer1M: 1.25 },
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-3-5-haiku-20241022': { inputPer1M: 0.8, outputPer1M: 4.0 },
  'claude-sonnet-4-5-20250929': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.25, outputPer1M: 1.25 },

  // Cohere
  'command-r-plus': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'command-r': { inputPer1M: 0.5, outputPer1M: 1.5 },
  'command': { inputPer1M: 1.0, outputPer1M: 2.0 },
  'command-light': { inputPer1M: 0.3, outputPer1M: 0.6 },

  // Google
  'gemini-pro': { inputPer1M: 0.5, outputPer1M: 1.5 },
  'gemini-pro-vision': { inputPer1M: 0.5, outputPer1M: 1.5 },
  'gemini-1.5-pro': { inputPer1M: 3.5, outputPer1M: 10.5 },
  'gemini-1.5-flash': { inputPer1M: 0.35, outputPer1M: 1.05 },

  // Mistral
  'mistral-large-latest': { inputPer1M: 4.0, outputPer1M: 12.0 },
  'mistral-medium-latest': { inputPer1M: 2.7, outputPer1M: 8.1 },
  'mistral-small-latest': { inputPer1M: 1.0, outputPer1M: 3.0 },
  'mistral-tiny': { inputPer1M: 0.25, outputPer1M: 0.25 },
};

/**
 * Calculate cost for a trace based on token usage and model
 */
export function calculateCost(options: {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): number {
  const { model, promptTokens, completionTokens, totalTokens } = options;

  // Normalize model name (remove version suffixes, handle aliases)
  const normalizedModel = normalizeModelName(model);

  // Get pricing for model
  const pricing = MODEL_PRICING[normalizedModel];

  if (!pricing) {
    // Unknown model - estimate using average pricing
    console.warn(`Unknown model: ${model}, using fallback pricing`);
    return estimateCostFallback(totalTokens || 0);
  }

  // If we have breakdown, use it for accuracy
  if (promptTokens !== undefined && completionTokens !== undefined) {
    const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
    return inputCost + outputCost;
  }

  // Otherwise, estimate using total tokens (assume 50/50 split)
  if (totalTokens) {
    const estimatedPrompt = totalTokens * 0.5;
    const estimatedCompletion = totalTokens * 0.5;
    const inputCost = (estimatedPrompt / 1_000_000) * pricing.inputPer1M;
    const outputCost = (estimatedCompletion / 1_000_000) * pricing.outputPer1M;
    return inputCost + outputCost;
  }

  return 0;
}

/**
 * Normalize model names to match pricing keys
 */
function normalizeModelName(model: string): string {
  const normalized = model.toLowerCase().trim();

  // Handle common aliases and variations
  const aliases: Record<string, string> = {
    'gpt-4-turbo-preview': 'gpt-4-turbo',
    'gpt-4-1106-preview': 'gpt-4-turbo',
    'gpt-4-0125-preview': 'gpt-4-turbo',
    'gpt-35-turbo': 'gpt-3.5-turbo',
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3-haiku': 'claude-3-haiku-20240307',
    'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-3.5-haiku': 'claude-3-5-haiku-20241022',
  };

  return aliases[normalized] || normalized;
}

/**
 * Fallback cost estimation for unknown models
 * Uses average of mid-tier models
 */
function estimateCostFallback(totalTokens: number): number {
  // Average mid-tier pricing (~$2/1M input, $6/1M output)
  const avgInputPer1M = 2.0;
  const avgOutputPer1M = 6.0;

  const estimatedPrompt = totalTokens * 0.5;
  const estimatedCompletion = totalTokens * 0.5;

  const inputCost = (estimatedPrompt / 1_000_000) * avgInputPer1M;
  const outputCost = (estimatedCompletion / 1_000_000) * avgOutputPer1M;

  return inputCost + outputCost;
}

/**
 * Get pricing information for a model
 */
export function getModelPricing(model: string): ModelPricing | null {
  const normalized = normalizeModelName(model);
  return MODEL_PRICING[normalized] || null;
}

/**
 * List all supported models
 */
export function getSupportedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}

/**
 * Calculate cost breakdown (useful for debugging)
 */
export function calculateCostBreakdown(options: {
  model: string;
  promptTokens: number;
  completionTokens: number;
}): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  pricing: ModelPricing;
} {
  const { model, promptTokens, completionTokens } = options;
  const normalized = normalizeModelName(model);
  const pricing = MODEL_PRICING[normalized];

  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    pricing,
  };
}
