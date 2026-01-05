import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getVectorStore } from '@/lib/vector-store';
import { initLumina } from '@lumina/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize Lumina
const lumina = initLumina({
  api_key: process.env.LUMINA_API_KEY || 'lumina_test123_abc',
  service_name: 'rag-example',
  environment: (process.env.NODE_ENV === 'production' ? 'live' : 'test') as 'live' | 'test',
});

export async function POST(req: NextRequest) {
  try {
    const { message, documents } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const vectorStore = getVectorStore();

    // If documents are provided, add them to the vector store
    if (documents && Array.isArray(documents) && documents.length > 0) {
      await vectorStore.addDocuments(
        documents.map((doc: any, index: number) => ({
          id: `doc-${Date.now()}-${index}`,
          content: doc.content,
          metadata: doc.metadata || {},
        }))
      );
    }

    // Search for relevant documents
    const relevantDocs = await vectorStore.search(message, 3);

    // Build context from relevant documents
    const context = relevantDocs
      .map((doc, i) => `Document ${i + 1}:\n${doc.content}`)
      .join('\n\n---\n\n');

    // Create RAG prompt
    const ragPrompt = context
      ? `You are a helpful assistant. Use the following context to answer the user's question. If the answer cannot be found in the context, say so.

Context:
${context}

User Question: ${message}

Answer:`
      : `You are a helpful assistant. Answer the following question:

${message}`;

    // Call Claude with Lumina tracing
    const response = await lumina.traceLLM(
      async () => {
        return await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: ragPrompt,
            },
          ],
        });
      },
      {
        name: '/api/rag',
        system: 'anthropic',
        prompt: ragPrompt,
        tags: ['rag', 'retrieval', 'nextjs'],
        metadata: {
          userId: 'rag-user',
          feature: 'rag',
          hasContext: relevantDocs.length > 0,
          numDocs: relevantDocs.length,
        },
      }
    );

    // Extract text from response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const answer = textContent ? textContent.text : 'No response generated';

    return NextResponse.json({
      answer,
      sources: relevantDocs.map((doc) => ({
        id: doc.id,
        content: doc.content.substring(0, 200) + '...',
        metadata: doc.metadata,
      })),
      documentsInStore: vectorStore.getAllDocuments().length,
    });
  } catch (error) {
    console.error('RAG API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Endpoint to clear the vector store
export async function DELETE() {
  try {
    const vectorStore = getVectorStore();
    vectorStore.clear();
    return NextResponse.json({ message: 'Vector store cleared' });
  } catch (error) {
    console.error('Failed to clear vector store:', error);
    return NextResponse.json({ error: 'Failed to clear vector store' }, { status: 500 });
  }
}
