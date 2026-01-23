#!/usr/bin/env bun
/**
 * Lumina + Anthropic Basic Integration Example
 *
 * This example shows how to integrate Lumina observability with Anthropic SDK.
 *
 * Setup:
 *   1. Start Lumina: cd ../../infra/docker && docker-compose up -d
 *   2. Set your Anthropic API key: export ANTHROPIC_API_KEY=sk-ant-...
 *   3. Run this example: bun run index.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { Lumina } from '@uselumina/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Lumina (no API key needed for self-hosted!)
const lumina = new Lumina({
  endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/v1/traces',
  serviceName: 'anthropic-basic-example',
  environment: 'development',
});

async function chatWithClaude(prompt: string) {
  console.log('\n📤 Sending prompt:', prompt);

  try {
    // Wrap your Anthropic call with lumina.traceLLM()
    const response = await lumina.traceLLM(
      async () => {
        return await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      },
      {
        name: 'chat-completion',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        prompt: prompt,
        tags: ['chat', 'example'],
        metadata: {
          max_tokens: 150,
        },
      }
    );

    const message = response.content[0]?.type === 'text' ? response.content[0].text : 'No response';
    console.log('📥 Response:', message);
    console.log(
      '💰 Cost:',
      `$${(response.usage.input_tokens * 0.000003 + response.usage.output_tokens * 0.000015).toFixed(6)}`
    );
    console.log(
      '📊 Tokens:',
      `${response.usage.input_tokens} input + ${response.usage.output_tokens} output = ${response.usage.input_tokens + response.usage.output_tokens} total`
    );
    console.log('✅ Trace sent to Lumina!');

    return message;
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Lumina + Anthropic (Claude) Integration Example');
  console.log('='.repeat(50));

  // Example 1: Simple chat
  await chatWithClaude('What is the capital of France?');

  // Example 2: More complex prompt
  await chatWithClaude('Explain quantum computing in one sentence.');

  // Example 3: Creative task
  await chatWithClaude('Write a haiku about observability.');

  console.log('\n✨ Done! Check your traces at http://localhost:3000/traces');
}

main().catch(console.error);
