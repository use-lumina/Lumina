/**
 * LLM Caller - Executes prompts against different LLM providers
 * Used by replay service to re-run production traces
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { calculateCost } from '@lumina/core';

export interface LLMCallResult {
  response: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  model: string;
  provider: string;
}

export interface LLMCallParams {
  provider: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(params: LLMCallParams): Promise<LLMCallResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  const openai = new OpenAI({ apiKey });
  const startTime = Date.now();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (params.systemPrompt) {
    messages.push({
      role: 'system',
      content: params.systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: params.prompt,
  });

  const response = await openai.chat.completions.create({
    model: params.model,
    messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1000,
  });

  const latencyMs = Date.now() - startTime;
  const choice = response.choices[0];
  const content = choice.message.content || '';

  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;
  const totalTokens = response.usage?.total_tokens || 0;

  const costUsd = calculateCost({
    provider: 'openai',
    model: params.model,
    promptTokens,
    completionTokens,
  });

  return {
    response: content,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs,
    model: params.model,
    provider: 'openai',
  };
}

/**
 * Call Anthropic (Claude) API
 */
async function callAnthropic(params: LLMCallParams): Promise<LLMCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  const anthropic = new Anthropic({ apiKey });
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 1000,
    temperature: params.temperature ?? 0.7,
    system: params.systemPrompt,
    messages: [
      {
        role: 'user',
        content: params.prompt,
      },
    ],
  });

  const latencyMs = Date.now() - startTime;

  // Extract text content from response
  const content = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('');

  const promptTokens = response.usage.input_tokens;
  const completionTokens = response.usage.output_tokens;
  const totalTokens = promptTokens + completionTokens;

  const costUsd = calculateCost({
    provider: 'anthropic',
    model: params.model,
    promptTokens,
    completionTokens,
  });

  return {
    response: content,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs,
    model: params.model,
    provider: 'anthropic',
  };
}

/**
 * Call the appropriate LLM provider
 */
export async function callLLM(params: LLMCallParams): Promise<LLMCallResult> {
  const provider = params.provider.toLowerCase();

  switch (provider) {
    case 'openai':
      return await callOpenAI(params);

    case 'anthropic':
    case 'claude':
      return await callAnthropic(params);

    default:
      throw new Error(`Unsupported provider: ${params.provider}`);
  }
}

/**
 * Infer provider from model name
 */
export function inferProvider(model: string): string {
  const modelLower = model.toLowerCase();

  if (
    modelLower.includes('gpt') ||
    modelLower.includes('davinci') ||
    modelLower.includes('turbo')
  ) {
    return 'openai';
  }

  if (
    modelLower.includes('claude') ||
    modelLower.includes('sonnet') ||
    modelLower.includes('opus') ||
    modelLower.includes('haiku')
  ) {
    return 'anthropic';
  }

  // Default to openai if unknown
  return 'openai';
}
