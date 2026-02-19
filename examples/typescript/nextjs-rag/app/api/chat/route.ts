import Anthropic from '@anthropic-ai/sdk';
import { initLumina } from '@uselumina/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Lumina SDK
const lumina = initLumina({
  api_key: process.env.LUMINA_API_KEY || 'lumina_test123_abc',
  endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/v1/traces',
  service_name: 'nextjs-rag-example',
  environment: 'live',
});

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message: string };
    const { message } = body;

    // Wrap the Anthropic call with lumina.traceLLM()
    const response = await lumina.traceLLM(
      async () => {
        return await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          messages: [{ role: 'user', content: message }],
        });
      },
      {
        name: '/api/chat',
        system: 'anthropic',
        prompt: message,
        tags: ['nextjs', 'rag', 'test', 'anthropic'],
        metadata: {
          endpoint: '/api/chat',
          userMessage: message,
        },
      }
    );

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
