#!/usr/bin/env bun
/**
 * Alert System Testing Script
 *
 * This script simulates various scenarios to trigger alerts:
 * 1. Cost spike alerts
 * 2. Quality drop alerts (structural)
 * 3. Quality drop alerts (semantic)
 * 4. Combined cost + quality alerts
 *
 * Usage:
 *   bun run infra/scripts/test-alerts.ts [scenario]
 *
 * Scenarios:
 *   - cost-spike: Simulate sudden cost increase
 *   - quality-drop: Simulate quality degradation
 *   - combined: Simulate cost spike + quality drop
 *   - all: Run all scenarios
 */

import { Lumina } from '../../packages/sdk/src';

const API_URL = process.env.LUMINA_ENDPOINT || 'http://localhost:8080';
const API_KEY =
  process.env.LUMINA_API_KEY ||
  'lumina_customer_9cd1f4692e64871f_e5a102dec3e12c84b275c3e64bb5cdef9d7a3237';

const lumina = new Lumina({
  endpoint: API_URL,
  api_key: API_KEY,
  service_name: 'alert-test-service',
  environment: 'live',
});

interface TestScenario {
  name: string;
  description: string;
  run: () => Promise<void>;
}

/**
 * Scenario 1: Cost Spike Alert
 *
 * Strategy:
 * 1. Send 50 baseline traces with normal cost (~$0.001 each)
 * 2. Send 5 expensive traces ($0.01+ each) to trigger cost spike
 */
async function testCostSpike() {
  console.log('\n🔥 Testing Cost Spike Alert...\n');

  // Step 1: Create baseline (normal cost)
  console.log('📊 Creating baseline with normal costs...');
  for (let i = 0; i < 50; i++) {
    await lumina.traceLLM(
      async () => {
        // Simulate a normal LLM call
        return {
          content: 'This is a normal response with moderate length.',
          usage: {
            prompt_tokens: 50,
            completion_tokens: 20,
            total_tokens: 70,
          },
        };
      },
      {
        name: '/api/chat',
        metadata: {
          scenario: 'cost-spike-baseline',
          iteration: i,
          model: 'claude-3-haiku-20240307',
          temperature: 0.7,
        },
      }
    );

    // Small delay to avoid rate limiting
    if (i % 10 === 0) {
      console.log(`  ✓ Sent ${i + 1}/50 baseline traces`);
      await sleep(100);
    }
  }

  console.log('✅ Baseline created (50 traces)\n');

  // Wait for baseline calculation
  console.log('⏳ Waiting 5 seconds for baseline calculation...');
  await sleep(5000);

  // Step 2: Send expensive traces
  console.log('💸 Sending expensive traces to trigger cost spike...');
  for (let i = 0; i < 5; i++) {
    await lumina.traceLLM(
      async () => {
        // Simulate an expensive LLM call (10x more tokens)
        return {
          content: 'This is a very expensive response. '.repeat(100), // Much longer response
          usage: {
            prompt_tokens: 500, // 10x more tokens
            completion_tokens: 500,
            total_tokens: 1000,
          },
        };
      },
      {
        name: '/api/chat',
        metadata: {
          scenario: 'cost-spike-trigger',
          iteration: i,
          model: 'claude-3-opus-20240229', // More expensive model
          temperature: 0.7,
        },
      }
    );

    console.log(`  🚨 Sent expensive trace ${i + 1}/5`);
    await sleep(500);
  }

  console.log('\n✅ Cost spike scenario complete!');
  console.log('🔔 Check your alerts - you should see cost spike alerts\n');
}

/**
 * Scenario 2: Quality Drop Alert (Structural)
 *
 * Strategy:
 * 1. Send 50 baseline traces with consistent output
 * 2. Send 5 traces with completely different output (low hash similarity)
 */
async function testQualityDrop() {
  console.log('\n🔻 Testing Quality Drop Alert (Structural)...\n');

  const baselinePrompt = 'What is the capital of France?';
  const baselineResponse = 'The capital of France is Paris.';

  // Step 1: Create baseline (consistent responses)
  console.log('📊 Creating baseline with consistent responses...');
  for (let i = 0; i < 50; i++) {
    await lumina.traceLLM(
      async () => {
        return {
          content: baselineResponse + (i % 3 === 0 ? ' It is known for the Eiffel Tower.' : ''),
          usage: {
            prompt_tokens: 20,
            completion_tokens: 15,
            total_tokens: 35,
          },
        };
      },
      {
        name: '/api/geography',
        prompt: baselinePrompt,
        metadata: {
          scenario: 'quality-drop-baseline',
          iteration: i,
          model: 'claude-3-haiku-20240307',
          temperature: 0.1, // Low temperature for consistency
        },
      }
    );

    if (i % 10 === 0) {
      console.log(`  ✓ Sent ${i + 1}/50 baseline traces`);
      await sleep(100);
    }
  }

  console.log('✅ Baseline created (50 traces)\n');

  // Wait for baseline calculation
  console.log('⏳ Waiting 5 seconds for baseline calculation...');
  await sleep(5000);

  // Step 2: Send completely different responses
  console.log('🔀 Sending traces with different responses...');
  const badResponses = [
    'London is the capital of England, known for Big Ben.',
    'Rome is famous for the Colosseum and Italian cuisine.',
    'Berlin has the Brandenburg Gate and rich history.',
    'Tokyo is a bustling metropolis in Japan.',
    'New York City has the Statue of Liberty.',
  ];

  for (let i = 0; i < badResponses.length; i++) {
    await lumina.traceLLM(
      async () => {
        return {
          content: badResponses[i],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 15,
            total_tokens: 35,
          },
        };
      },
      {
        name: '/api/geography',
        prompt: baselinePrompt, // Same prompt
        metadata: {
          scenario: 'quality-drop-trigger',
          iteration: i,
          model: 'claude-3-haiku-20240307',
          temperature: 0.1,
        },
      }
    );

    console.log(`  🚨 Sent bad response ${i + 1}/5: "${badResponses[i].substring(0, 50)}..."`);
    await sleep(500);
  }

  console.log('\n✅ Quality drop scenario complete!');
  console.log('🔔 Check your alerts - you should see quality drop alerts\n');
}

/**
 * Scenario 3: Quality Drop Alert (Semantic with Hallucinations)
 *
 * Strategy:
 * 1. Send 50 baseline traces with accurate responses
 * 2. Send 5 traces with hallucinated/incorrect responses
 */
async function testSemanticQualityDrop() {
  console.log('\n🤥 Testing Semantic Quality Drop (Hallucinations)...\n');

  const prompt = 'What is 2 + 2?';
  const correctResponse = 'The answer is 4.';

  // Step 1: Create baseline (correct answers)
  console.log('📊 Creating baseline with correct answers...');
  for (let i = 0; i < 50; i++) {
    await lumina.traceLLM(
      async () => {
        return {
          content: correctResponse + (i % 2 === 0 ? ' This is basic arithmetic.' : ''),
          usage: {
            prompt_tokens: 15,
            completion_tokens: 10,
            total_tokens: 25,
          },
        };
      },
      {
        name: '/api/math',
        prompt: prompt,
        metadata: {
          scenario: 'semantic-quality-baseline',
          iteration: i,
          model: 'claude-3-haiku-20240307',
          temperature: 0,
        },
      }
    );

    if (i % 10 === 0) {
      console.log(`  ✓ Sent ${i + 1}/50 baseline traces`);
      await sleep(100);
    }
  }

  console.log('✅ Baseline created (50 traces)\n');

  // Wait for baseline calculation
  console.log('⏳ Waiting 5 seconds for baseline calculation...');
  await sleep(5000);

  // Step 2: Send hallucinated responses
  console.log('🎭 Sending hallucinated responses...');
  const hallucinatedResponses = [
    'The answer is 5. I am very confident about this.',
    'The answer is 22. This is correct because 2 times 2 is 22.',
    'The answer is 3. This is based on quantum mathematics.',
    'The answer is 4.2. Due to rounding, 2 + 2 equals 4.2.',
    'The answer is 11. In binary, 2 + 2 equals 11.',
  ];

  for (let i = 0; i < hallucinatedResponses.length; i++) {
    await lumina.traceLLM(
      async () => {
        return {
          content: hallucinatedResponses[i],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 20,
            total_tokens: 35,
          },
        };
      },
      {
        name: '/api/math',
        prompt: prompt,
        metadata: {
          scenario: 'semantic-quality-trigger',
          iteration: i,
          hallucinated: true,
          model: 'claude-3-haiku-20240307',
          temperature: 0,
        },
      }
    );

    console.log(
      `  🚨 Sent hallucination ${i + 1}/5: "${hallucinatedResponses[i].substring(0, 50)}..."`
    );
    await sleep(500);
  }

  console.log('\n✅ Semantic quality drop scenario complete!');
  console.log('🔔 Check your alerts - you should see semantic quality alerts\n');
}

/**
 * Scenario 4: Combined Cost Spike + Quality Drop
 *
 * Strategy:
 * Send traces that are both expensive AND low quality
 */
async function testCombinedAlert() {
  console.log('\n💥 Testing Combined Cost + Quality Alert...\n');

  const prompt = 'Explain quantum computing in simple terms';
  const goodResponse =
    'Quantum computing uses quantum bits (qubits) to perform calculations that would be impossible for classical computers.';

  // Step 1: Create baseline
  console.log('📊 Creating baseline with good responses...');
  for (let i = 0; i < 50; i++) {
    await lumina.traceLLM(
      async () => {
        return {
          content: goodResponse + ' This technology is still in development.',
          usage: {
            prompt_tokens: 30,
            completion_tokens: 40,
            total_tokens: 70,
          },
        };
      },
      {
        name: '/api/explain',
        prompt: prompt,
        metadata: {
          scenario: 'combined-baseline',
          iteration: i,
          model: 'claude-3-haiku-20240307',
          temperature: 0.5,
        },
      }
    );

    if (i % 10 === 0) {
      console.log(`  ✓ Sent ${i + 1}/50 baseline traces`);
      await sleep(100);
    }
  }

  console.log('✅ Baseline created (50 traces)\n');

  // Wait for baseline calculation
  console.log('⏳ Waiting 5 seconds for baseline calculation...');
  await sleep(5000);

  // Step 2: Send expensive + bad quality traces
  console.log('💸🔀 Sending expensive traces with bad responses...');
  const badResponses = [
    'Quantum computing is when computers use quantum. ' + 'Lorem ipsum dolor sit amet. '.repeat(50),
    'It is about using quantum mechanics for stuff. ' +
      'More text here to make it expensive. '.repeat(50),
    'Quantum computers are just regular computers but quantum. ' + 'Padding text. '.repeat(50),
  ];

  for (let i = 0; i < 3; i++) {
    await lumina.traceLLM(
      async () => {
        return {
          content: badResponses[i],
          usage: {
            prompt_tokens: 500, // 10x more expensive
            completion_tokens: 800,
            total_tokens: 1300,
          },
        };
      },
      {
        name: '/api/explain',
        prompt: prompt,
        metadata: {
          scenario: 'combined-trigger',
          iteration: i,
          expensive_and_bad: true,
          model: 'claude-3-opus-20240229', // Expensive model
          temperature: 0.5,
        },
      }
    );

    console.log(`  🚨 Sent expensive + bad trace ${i + 1}/3`);
    await sleep(500);
  }

  console.log('\n✅ Combined alert scenario complete!');
  console.log('🔔 Check your alerts - you should see HIGH severity combined alerts\n');
}

/**
 * Scenario 5: Latency Spike (Bonus)
 */
async function testLatencySpike() {
  console.log('\n⏱️  Testing Latency Spike Alert...\n');

  // Step 1: Fast baseline
  console.log('📊 Creating baseline with fast responses...');
  for (let i = 0; i < 50; i++) {
    await lumina.traceLLM(
      async () => {
        await sleep(50); // Fast response
        return {
          content: 'Quick response',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        };
      },
      {
        name: '/api/fast',
        metadata: {
          scenario: 'latency-baseline',
          iteration: i,
          model: 'claude-3-haiku-20240307',
        },
      }
    );

    if (i % 10 === 0) {
      console.log(`  ✓ Sent ${i + 1}/50 fast traces`);
    }
  }

  console.log('✅ Baseline created\n');
  await sleep(5000);

  // Step 2: Slow traces
  console.log('🐌 Sending slow traces...');
  for (let i = 0; i < 5; i++) {
    await lumina.traceLLM(
      async () => {
        await sleep(5000); // 100x slower
        return {
          content: 'Slow response',
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        };
      },
      {
        name: '/api/fast',
        metadata: {
          scenario: 'latency-trigger',
          iteration: i,
          model: 'claude-3-haiku-20240307',
        },
      }
    );

    console.log(`  🚨 Sent slow trace ${i + 1}/5`);
  }

  console.log('\n✅ Latency spike scenario complete!\n');
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main execution
const scenarios: Record<string, TestScenario> = {
  'cost-spike': {
    name: 'Cost Spike',
    description: 'Trigger cost spike alerts by sending expensive traces',
    run: testCostSpike,
  },
  'quality-drop': {
    name: 'Quality Drop (Structural)',
    description: 'Trigger quality drop alerts with different responses',
    run: testQualityDrop,
  },
  'semantic-quality': {
    name: 'Quality Drop (Semantic)',
    description: 'Trigger semantic quality alerts with hallucinations',
    run: testSemanticQualityDrop,
  },
  combined: {
    name: 'Combined Alert',
    description: 'Trigger combined cost + quality alerts',
    run: testCombinedAlert,
  },
  latency: {
    name: 'Latency Spike',
    description: 'Trigger latency spike alerts',
    run: testLatencySpike,
  },
};

async function main() {
  const scenario = process.argv[2] || 'all';

  console.log('╔════════════════════════════════════════╗');
  console.log('║   Lumina Alert System Test Suite      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('');

  if (scenario === 'all') {
    console.log('🎯 Running all scenarios...\n');
    for (const [_key, test] of Object.entries(scenarios)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Running: ${test.name}`);
      console.log(`${test.description}`);
      console.log('='.repeat(60));
      await test.run();
      await sleep(2000); // Pause between scenarios
    }
  } else if (scenarios[scenario]) {
    const test = scenarios[scenario];
    console.log(`🎯 Running scenario: ${test.name}\n`);
    console.log(`${test.description}\n`);
    await test.run();
  } else {
    console.error(`❌ Unknown scenario: ${scenario}`);
    console.log('\nAvailable scenarios:');
    Object.entries(scenarios).forEach(([key, test]) => {
      console.log(`  - ${key}: ${test.description}`);
    });
    console.log('  - all: Run all scenarios');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests complete!');
  console.log('='.repeat(60));

  // Flush all pending spans before exiting
  console.log('\n⏳ Flushing pending traces...');
  await lumina.flush();
  console.log('✅ All traces sent successfully!');

  console.log('\n📊 Next steps:');
  console.log('  1. Check your dashboard: http://localhost:3000/alerts');
  console.log('  2. Verify alerts were created');
  console.log('  3. Check Slack/Discord webhooks (if configured)');
  console.log('');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
