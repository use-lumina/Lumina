/**
 * Semantic quality scoring using Claude Haiku
 * Second tier in hybrid quality detection for accurate evaluation
 */

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { getCache, setCache } from './cache';

let anthropic: Anthropic | null = null;

/**
 * Initialize Anthropic client
 */
export function initializeSemanticScorer(apiKey?: string): void {
  if (anthropic) return;

  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    console.warn('ANTHROPIC_API_KEY not set, semantic scoring will be disabled');
    return;
  }

  anthropic = new Anthropic({ apiKey: key });
  console.log('✓ Semantic scorer initialized');
}

export interface SemanticScore {
  score: number; // 0-1 quality score
  reasoning?: string; // Optional explanation
  cached: boolean; // Was this from cache?
}

/**
 * Scores the semantic quality of an AI response using Claude Haiku
 *
 * Returns a score from 0-1 where:
 * - 0.9-1.0 = Excellent (accurate, relevant, well-formatted)
 * - 0.7-0.9 = Good (minor issues)
 * - 0.5-0.7 = Concerning (noticeable problems)
 * - 0.0-0.5 = Poor (hallucinations, irrelevant, incorrect)
 */
export async function scoreSemanticQuality(
  prompt: string,
  response: string,
  options: {
    includeReasoning?: boolean;
    useCache?: boolean;
  } = {}
): Promise<SemanticScore> {
  const { includeReasoning = false, useCache = true } = options;

  // Check if scorer is initialized
  if (!anthropic) {
    console.warn('Semantic scorer not initialized, returning neutral score');
    return { score: 0.75, cached: false };
  }

  // Check cache first (avoid re-scoring identical prompt+response pairs)
  if (useCache) {
    const cacheKey = generateCacheKey(prompt, response);
    const cached = await getCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Fast + cheap ($0.25 per 1M input tokens)
      max_tokens: includeReasoning ? 200 : 50,
      temperature: 0, // Deterministic scoring
      messages: [
        {
          role: 'user',
          content: buildEvaluationPrompt(prompt, response, includeReasoning),
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const result = parseEvaluationResponse(content.text.trim(), includeReasoning);

    // Cache the result for 24 hours
    if (useCache) {
      const cacheKey = generateCacheKey(prompt, response);
      await setCache(cacheKey, result, 86400);
    }

    return { ...result, cached: false };
  } catch (error) {
    console.error('Semantic scoring failed:', error);
    // Fallback to neutral score on API failure
    return { score: 0.75, cached: false };
  }
}

/**
 * Build evaluation prompt for Claude
 */
function buildEvaluationPrompt(
  prompt: string,
  response: string,
  includeReasoning: boolean
): string {
  const base = `Evaluate this AI response on a scale from 0 to 1.

Consider:
- Relevance to the prompt
- Factual accuracy (no hallucinations)
- Completeness of answer
- Appropriate tone and format

User Prompt:
${prompt}

AI Response:
${response}

${
  includeReasoning
    ? 'Respond with a JSON object: {"score": 0.85, "reasoning": "Brief explanation"}'
    : 'Respond with ONLY a number between 0 and 1 (e.g., 0.85)'
}`;

  return base;
}

/**
 * Parse Claude's evaluation response
 */
function parseEvaluationResponse(
  content: string,
  includeReasoning: boolean
): Omit<SemanticScore, 'cached'> {
  if (includeReasoning) {
    try {
      const parsed = JSON.parse(content);
      return {
        score: parseFloat(parsed.score),
        reasoning: parsed.reasoning,
      };
    } catch {
      // Fallback: try to extract just the number
      const match = content.match(/\d+\.?\d*/);
      return { score: match ? parseFloat(match[0]) : 0.75 };
    }
  } else {
    const match = content.match(/\d+\.?\d*/);
    return { score: match ? parseFloat(match[0]) : 0.75 };
  }
}

/**
 * Generate cache key for prompt+response pair
 */
function generateCacheKey(prompt: string, response: string): string {
  return `semantic:${createHash('sha256')
    .update(`${prompt}|||${response}`)
    .digest('hex')}`;
}

/**
 * Batch score multiple responses (processes sequentially to avoid rate limits)
 */
export async function batchScoreSemanticQuality(
  pairs: Array<{ prompt: string; response: string }>,
  options: {
    includeReasoning?: boolean;
    useCache?: boolean;
    delayMs?: number;
  } = {}
): Promise<SemanticScore[]> {
  const { delayMs = 100 } = options; // Small delay to avoid rate limits
  const results: SemanticScore[] = [];

  for (const pair of pairs) {
    const result = await scoreSemanticQuality(pair.prompt, pair.response, options);
    results.push(result);

    // Add small delay between requests
    if (delayMs > 0 && pairs.indexOf(pair) < pairs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}