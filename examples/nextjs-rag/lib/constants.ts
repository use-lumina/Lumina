/**
 * Application constants and configuration
 */

export const APP_CONFIG = {
  name: 'Lumina Chat Demo',
  description: 'Demo chat application with Lumina SDK',
  version: '0.1.0',
} as const;

export const OPENAI_CONFIG = {
  model: 'gpt-3.5-turbo',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
} as const;

export const UI_CONFIG = {
  streamingDelay: 50, // milliseconds between words in demo mode
  maxInputLength: 4000,
  scrollBehavior: 'smooth' as ScrollBehavior,
} as const;

export const MESSAGES = {
  errors: {
    noMessages: 'No messages provided',
    apiError: 'An error occurred while processing your request.',
    noApiKey: 'OpenAI API key is not configured',
    noResponseBody: 'No response body from OpenAI',
  },
  placeholders: {
    input: 'Type your message...',
  },
  emptyState: {
    title: 'Start a conversation',
    description: 'Send a message to begin chatting',
  },
} as const;
