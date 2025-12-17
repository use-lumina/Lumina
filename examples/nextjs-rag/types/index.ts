/**
 * Message interface for chat messages
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  details?: string;
}

/**
 * Chat API request body
 */
export interface ChatRequest {
  messages: Message[];
}

/**
 * Environment configuration
 */
export interface EnvConfig {
  OPENAI_API_KEY?: string;
}
