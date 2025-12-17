// OpenTelemetry Semantic Conventions for LLM Operations
// Based on OpenTelemetry AI/ML conventions proposal
// See: https://github.com/open-telemetry/semantic-conventions/issues/327

export const LLM_SYSTEM = 'gen_ai.system';
export const LLM_REQUEST_MODEL = 'gen_ai.request.model';
export const LLM_REQUEST_MAX_TOKENS = 'gen_ai.request.max_tokens';
export const LLM_REQUEST_TEMPERATURE = 'gen_ai.request.temperature';
export const LLM_REQUEST_TOP_P = 'gen_ai.request.top_p';

export const LLM_RESPONSE_MODEL = 'gen_ai.response.model';
export const LLM_RESPONSE_ID = 'gen_ai.response.id';
export const LLM_RESPONSE_FINISH_REASON = 'gen_ai.response.finish_reason';

export const LLM_USAGE_PROMPT_TOKENS = 'gen_ai.usage.prompt_tokens';
export const LLM_USAGE_COMPLETION_TOKENS = 'gen_ai.usage.completion_tokens';
export const LLM_USAGE_TOTAL_TOKENS = 'gen_ai.usage.total_tokens';

export const LLM_PROMPT = 'gen_ai.prompt';
export const LLM_COMPLETION = 'gen_ai.completion';

// Lumina-specific extensions
export const LUMINA_CUSTOMER_ID = 'lumina.customer_id';
export const LUMINA_ENVIRONMENT = 'lumina.environment';
export const LUMINA_SERVICE_NAME = 'lumina.service_name';
export const LUMINA_ENDPOINT = 'lumina.endpoint';
export const LUMINA_COST_USD = 'lumina.cost_usd';
export const LUMINA_RESPONSE_HASH = 'lumina.response_hash';
export const LUMINA_TAGS = 'lumina.tags';

// Span names
export const SPAN_NAME_LLM_REQUEST = 'llm.request';
export const SPAN_NAME_LLM_GENERATION = 'llm.generation';
export const SPAN_NAME_RAG_RETRIEVAL = 'rag.retrieval';
export const SPAN_NAME_EMBEDDING = 'embedding.generation';