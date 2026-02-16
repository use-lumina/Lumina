#!/usr/bin/env bun

/**
 * Seed Multi-Span RAG Trace
 *
 * Creates a sample hierarchical trace for testing multi-span visualization:
 * - Parent span: RAG pipeline
 * - Child span 1: Vector DB retrieval
 * - Child span 2: LLM synthesis
 */

import postgres from 'postgres';
import { randomBytes } from 'crypto';

async function main() {
  const databaseUrl = process.env.DATABASE_URL || 'postgres://lumina:lumina@localhost:5432/lumina';
  const sql = postgres(databaseUrl);

  try {
    console.log('\n🌱 Seeding multi-span RAG trace...\n');

    const customerId = 'default-customer';

    // Generate shared trace ID for all spans
    const traceId = `trace_${randomBytes(8).toString('hex')}`;
    const parentSpanId = `span_${randomBytes(8).toString('hex')}`;
    const retrievalSpanId = `span_${randomBytes(8).toString('hex')}`;
    const synthesisSpanId = `span_${randomBytes(8).toString('hex')}`;

    const timestamp = new Date();

    // Parent span: RAG Pipeline (total operation)
    console.log('📄 Creating parent span: RAG pipeline');
    await sql`
      INSERT INTO traces (
        trace_id, span_id, parent_span_id, customer_id,
        timestamp, service_name, endpoint, environment,
        model, provider, prompt, response,
        tokens, prompt_tokens, completion_tokens,
        latency_ms, cost_usd, metadata, tags, status
      ) VALUES (
        ${traceId},
        ${parentSpanId},
        ${null},
        ${customerId},
        ${timestamp},
        ${'rag-qa-service'},
        ${'/api/rag/query'},
        ${'live'},
        ${'claude-3-5-sonnet-20241022'},
        ${'anthropic'},
        ${'What are the key features of the new product launch?'},
        ${'Based on the retrieved documents, the key features include: 1) AI-powered recommendations, 2) Real-time analytics dashboard, 3) Seamless integration with existing tools, 4) Advanced security features.'},
        ${3200},
        ${2500},
        ${700},
        ${1500},
        ${0.0195},
        ${{ user_id: 'user_789', session_id: 'session_abc123', rag_version: '2.1' }},
        ${['production', 'rag-qa-service']},
        ${'success'}
      )
    `;

    // Child span 1: Vector DB Retrieval
    console.log('🔎 Creating child span 1: retrieval');
    await sql`
      INSERT INTO traces (
        trace_id, span_id, parent_span_id, customer_id,
        timestamp, service_name, endpoint, environment,
        model, provider, prompt, response,
        tokens, prompt_tokens, completion_tokens,
        latency_ms, cost_usd, metadata, tags, status
      ) VALUES (
        ${traceId},
        ${retrievalSpanId},
        ${parentSpanId},
        ${customerId},
        ${new Date(timestamp.getTime() + 10)},
        ${'vector-db-retrieval'},
        ${'/api/vector/search'},
        ${'live'},
        ${'text-embedding-ada-002'},
        ${'openai'},
        ${'What are the key features of the new product launch?'},
        ${'Retrieved 5 relevant documents from vector DB'},
        ${500},
        ${500},
        ${0},
        ${800},
        ${0.0002},
        ${{ db_name: 'product_docs', results_count: 5, similarity_threshold: 0.85 }},
        ${['retrieval', 'vector-db']},
        ${'success'}
      )
    `;

    // Child span 2: LLM Synthesis
    console.log('🤖 Creating child span 2: synthesis');
    await sql`
      INSERT INTO traces (
        trace_id, span_id, parent_span_id, customer_id,
        timestamp, service_name, endpoint, environment,
        model, provider, prompt, response,
        tokens, prompt_tokens, completion_tokens,
        latency_ms, cost_usd, metadata, tags, status
      ) VALUES (
        ${traceId},
        ${synthesisSpanId},
        ${parentSpanId},
        ${customerId},
        ${new Date(timestamp.getTime() + 820)},
        ${'llm-synthesis'},
        ${'/api/llm/generate'},
        ${'live'},
        ${'claude-3-5-sonnet-20241022'},
        ${'anthropic'},
        ${'Context: [5 documents]\n\nQuestion: What are the key features of the new product launch?\n\nProvide a concise answer based on the context.'},
        ${'Based on the retrieved documents, the key features include: 1) AI-powered recommendations, 2) Real-time analytics dashboard, 3) Seamless integration with existing tools, 4) Advanced security features.'},
        ${2700},
        ${2000},
        ${700},
        ${700},
        ${0.0193},
        ${{ context_docs: 5, synthesis_prompt_template: 'rag-qa-v2' }},
        ${['synthesis', 'llm']},
        ${'success'}
      )
    `;

    console.log('\n✅ Multi-span RAG trace created successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Trace ID: ${traceId}`);
    console.log(`Parent Span ID: ${parentSpanId}`);
    console.log(`  └─ Retrieval Span ID: ${retrievalSpanId}`);
    console.log(`  └─ Synthesis Span ID: ${synthesisSpanId}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🚀 View in dashboard:');
    console.log(`   http://localhost:3000/traces/${traceId}\n`);
  } catch (error) {
    console.error('❌ Error seeding multi-span trace:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
