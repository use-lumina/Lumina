import { StreamingTextResponse } from 'ai';

import type { ChatRequest, ApiError } from '@/types';
import { OPENAI_CONFIG, MESSAGES, UI_CONFIG } from '@/lib/constants';

// IMPORTANT: Set the runtime to edge for optimal performance
export const runtime = 'edge';

/**
 * POST handler for chat completions
 * Supports both demo mode (without API key) and OpenAI integration
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as ChatRequest;
    const { messages } = body;

    // Validate request
    if (!messages || messages.length === 0) {
      return createErrorResponse(MESSAGES.errors.noMessages, 400);
    }

    // Demo mode: Return mock streaming response if no API key
    if (!process.env.OPENAI_API_KEY) {
      return handleDemoMode(messages);
    }

    // Production mode: Use OpenAI API
    return await handleOpenAIRequest(messages);
  } catch (error) {
    console.error('[Chat API Error]:', error);
    const errorMessage = error instanceof Error ? error.message : MESSAGES.errors.apiError;

    return createErrorResponse(errorMessage, 500);
  }
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(message: string, status: number): Response {
  const error: ApiError = { error: message };
  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handles demo mode with mock streaming responses
 */
function handleDemoMode(messages: ChatRequest['messages']): Response {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    return createErrorResponse(MESSAGES.errors.noMessages, 400);
  }

  const demoResponse = generateDemoResponse(lastMessage.content);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const words = demoResponse.split(' ');
      let i = 0;

      const interval = setInterval(() => {
        if (i < words.length) {
          controller.enqueue(encoder.encode(words[i] + ' '));
          i++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, UI_CONFIG.streamingDelay);
    },
  });

  return new StreamingTextResponse(stream);
}

/**
 * Handles OpenAI API requests
 */
async function handleOpenAIRequest(messages: ChatRequest['messages']): Promise<Response> {
  const response = await fetch(OPENAI_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.model,
      messages: messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.statusText} ${JSON.stringify(errorData)}`);
  }

  if (!response.body) {
    throw new Error(MESSAGES.errors.noResponseBody);
  }

  return new StreamingTextResponse(response.body);
}

function generateDemoResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm a demo chat assistant. This is a demonstration of the Lumina SDK chat interface. To enable real AI responses, please add your OpenAI API key to the .env.local file.";
  }

  if (lowerMessage.includes('lumina')) {
    return "Lumina is an observability SDK for AI applications! This demo showcases how you can build chat interfaces that can be instrumented with Lumina for monitoring, tracing, and analytics. Once the Lumina SDK is built, you'll be able to track conversations, measure performance, and gain insights into your AI applications.";
  }

  if (lowerMessage.includes('how') || lowerMessage.includes('what')) {
    return `This is a demo response since no OpenAI API key is configured. This chat interface is built with Next.js and the Vercel AI SDK, ready to be instrumented with the Lumina observability SDK. To use real AI responses, add your OPENAI_API_KEY to .env.local file.`;
  }

  return `Thanks for your message! This is a demo chat interface built with Next.js and Vercel AI SDK. Currently running in demo mode without an API key. Your message was: "${message}". To enable real AI responses, configure your OpenAI API key in the environment variables.`;
}
