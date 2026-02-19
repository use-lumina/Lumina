# OpenTelemetry Semantic Conventions for LLM Operations
# Based on OpenTelemetry AI/ML conventions proposal
# See: https://github.com/open-telemetry/semantic-conventions/issues/327

# GenAI request attributes
LLM_SYSTEM = "gen_ai.system"
LLM_REQUEST_MODEL = "gen_ai.request.model"
LLM_REQUEST_MAX_TOKENS = "gen_ai.request.max_tokens"
LLM_REQUEST_TEMPERATURE = "gen_ai.request.temperature"
LLM_REQUEST_TOP_P = "gen_ai.request.top_p"

# GenAI response attributes
LLM_RESPONSE_MODEL = "gen_ai.response.model"
LLM_RESPONSE_ID = "gen_ai.response.id"
LLM_RESPONSE_FINISH_REASON = "gen_ai.response.finish_reason"

# GenAI usage attributes
LLM_USAGE_PROMPT_TOKENS = "gen_ai.usage.prompt_tokens"
LLM_USAGE_COMPLETION_TOKENS = "gen_ai.usage.completion_tokens"
LLM_USAGE_TOTAL_TOKENS = "gen_ai.usage.total_tokens"

# GenAI content attributes
LLM_PROMPT = "gen_ai.prompt"
LLM_COMPLETION = "gen_ai.completion"

# Lumina-specific extensions
LUMINA_CUSTOMER_ID = "lumina.customer_id"
LUMINA_ENVIRONMENT = "lumina.environment"
LUMINA_SERVICE_NAME = "lumina.service_name"
LUMINA_ENDPOINT = "lumina.endpoint"
LUMINA_COST_USD = "lumina.cost_usd"
LUMINA_RESPONSE_HASH = "lumina.response_hash"
LUMINA_TAGS = "lumina.tags"

# Span names
SPAN_NAME_LLM_REQUEST = "llm.request"
SPAN_NAME_LLM_GENERATION = "llm.generation"
SPAN_NAME_RAG_RETRIEVAL = "rag.retrieval"
SPAN_NAME_EMBEDDING = "embedding.generation"
