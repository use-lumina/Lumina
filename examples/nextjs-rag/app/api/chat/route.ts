import Anthropic from '@anthropic-ai/sdk';
import { initLumina } from '@lumina/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Lumina SDK
const lumina = initLumina({
  api_key: process.env.LUMINA_API_KEY || 'lumina_test_dummy_key',
  endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/ingest',
  environment: 'test',
});

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message: string };
    const { message } = body;

    console.log('[Next.js] Received message:', message);

    // Wrap the Anthropic call with lumina.trace()
    const response = await lumina.trace(
      async () => {
        return await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          messages: [{ role: 'user', content: message }],
        });
      },
      {
        name: '/api/chat',
        tags: ['nextjs', 'rag', 'test', 'anthropic'],
        metadata: {
          endpoint: '/api/chat',
          userMessage: message,
        },
      }
    );

    console.log('[Next.js] Response received from Anthropic');
    console.log('[Next.js] Lumina trace captured');

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : 'No response';

    return Response.json({
      message: reply,
      usage: response.usage,
      model: response.model,
    });
  } catch (error) {
    console.error('[Next.js] Error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
