# Replay Testing Guide

Test prompt and model changes safely by replaying production traces before deploying to production.

## Overview

The Replay feature allows you to:

- **Re-run production traces** with different models or prompts
- **Compare responses** side-by-side (original vs replay)
- **Measure impact** on cost, latency, and quality
- **Test safely** without affecting production

## Prerequisites

### API Keys Required

To use the replay feature with **real LLM calls**, you need to configure API keys:

```bash
# For Claude models (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# For GPT models (OpenAI)
OPENAI_API_KEY=sk-your-key-here
```

Add these to your `.env.docker` file (or `.env` for local development).

### Where to Get API Keys

- **Anthropic API Key**: [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI API Key**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

> **Note:** Without API keys, the replay feature runs in **simulation mode** (for testing the feature without API costs). Simulation mode generates synthetic variations but doesn't make real API calls.

## Quick Start

### 1. Create a Replay Set

Navigate to the **Replay Studio** in the dashboard:

```
http://localhost:3000/replay
```

Click **"Create Replay Set"** and:

1. Give it a name (e.g., "Test GPT-4 → Claude Haiku Migration")
2. Add a description
3. Select traces to replay (check the boxes)
4. Click **"Create Replay Set"**

### 2. Run the Replay

Click **"Run Replay"** on your replay set and configure:

- **Model** (optional): Change to a different model (e.g., `claude-3-5-haiku-20241022`, `gpt-4`)
- **Prompt** (optional): Modify the prompt text
- **System Prompt** (optional): Add or change the system prompt
- **Temperature & Max Tokens** (optional): Adjust parameters

Click **"Run Replay"** to execute.

### 3. View Results

Once complete, click **"View Results"** to see:

- **Cost comparison** (original vs replay)
- **Latency comparison** (original vs replay)
- **Prompt changes** (side-by-side if modified)
- **Response changes** (original vs replay)
- **Hash similarity** (character-level match)
- **Semantic similarity** (meaning match)

## Use Cases

### Test Model Migration

Compare costs and quality when switching models:

```json
{
  "replayId": "abc-123",
  "newModel": "claude-3-5-haiku-20241022"
}
```

**Example Results:**

- Cost: -68% (from $0.000585 to $0.000186)
- Latency: -43% (from 2481ms to 1422ms)
- Semantic similarity: 38.89%

### Test Prompt Changes

See how prompt modifications affect responses:

```json
{
  "replayId": "abc-123",
  "newPrompt": "Explain quantum computing briefly in one simple sentence."
}
```

**Example Results:**

- Response changed from technical to simple explanation
- Cost: -30%
- Latency: -40%

### A/B Test System Prompts

Compare different instruction styles:

```json
{
  "replayId": "abc-123",
  "newSystemPrompt": "You are a helpful assistant that explains technical concepts simply."
}
```

## API Usage

### Create Replay Set

```bash
curl -X POST http://localhost:8082/replay/capture \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Model Migration Test",
    "description": "Testing GPT-4 → Claude Haiku",
    "traceIds": ["trace-1", "trace-2", "trace-3"],
    "createdBy": "system"
  }'
```

**Response:**

```json
{
  "success": true,
  "replaySet": {
    "replay_id": "abc-123",
    "name": "Model Migration Test",
    "status": "pending",
    "total_traces": 3
  }
}
```

### Run Replay

```bash
curl -X POST http://localhost:8082/replay/run \
  -H "Content-Type: application/json" \
  -d '{
    "replayId": "abc-123",
    "newModel": "claude-3-5-haiku-20241022",
    "newPrompt": "Your modified prompt here",
    "newSystemPrompt": "Your system prompt here"
  }'
```

**Parameters:**

- `replayId` (required): The replay set ID
- `newModel` (optional): Model to use (e.g., `gpt-4`, `claude-sonnet-4`)
- `newPrompt` (optional): Modified prompt text
- `newSystemPrompt` (optional): System prompt
- `useRealLLM` (optional): Default `true` (set to `false` for simulation mode)

**Response:**

```json
{
  "success": true,
  "replayId": "abc-123",
  "completedCount": 3,
  "totalTraces": 3
}
```

### Get Replay Results

```bash
curl http://localhost:8082/replay/abc-123/diff
```

**Response:**

```json
{
  "data": [
    {
      "trace_id": "trace-1",
      "prompt": "Original prompt",
      "replay_prompt": "Modified prompt",
      "model": "gpt-4",
      "replay_model": "claude-3-5-haiku-20241022",
      "original_response": "Original response text",
      "replay_response": "Replay response text",
      "original_cost": 0.000585,
      "replay_cost": 0.000186,
      "original_latency": 2481,
      "replay_latency": 1422,
      "hash_similarity": 0.2636,
      "semantic_score": 0.3889,
      "diff_summary": {
        "cost_diff": -0.000399,
        "cost_diff_percent": -68.14,
        "latency_diff": -1059,
        "latency_diff_percent": -42.68,
        "response_changed": true,
        "model_changed": true,
        "using_real_llm": true
      }
    }
  ]
}
```

## Configuration

### Environment Variables

Add to your `.env.docker` file:

```bash
# Required for real LLM calls
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Optional: Replay service configuration
MAX_CONCURRENT_REPLAYS=5
REPLAY_TIMEOUT_MS=60000
```

### Restart Services

After adding API keys:

```bash
cd infra/docker
docker-compose down
docker-compose --env-file ../../.env.docker up -d
```

## Supported Models

### Anthropic (Claude)

Requires `ANTHROPIC_API_KEY`:

- `claude-opus-4-5-20251101` (latest Opus)
- `claude-sonnet-4-5-20250929` (latest Sonnet)
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### OpenAI (GPT)

Requires `OPENAI_API_KEY`:

- `gpt-4o` (latest)
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

## Understanding Results

### Hash Similarity

Character-level exact match between responses.

- **1.0 (100%)**: Identical responses
- **0.5 (50%)**: Half the characters match
- **0.0 (0%)**: Completely different

### Semantic Similarity

Word-level meaning comparison.

- **1.0 (100%)**: Same meaning, different wording
- **0.5 (50%)**: Partially similar meaning
- **0.0 (0%)**: Different meaning

### Cost Impact

```
cost_diff = replay_cost - original_cost
cost_diff_percent = (cost_diff / original_cost) * 100
```

- **Negative %**: Cost savings ✅
- **Positive %**: Cost increase ⚠️

### Latency Impact

```
latency_diff = replay_latency - original_latency
latency_diff_percent = (latency_diff / original_latency) * 100
```

- **Negative %**: Faster ✅
- **Positive %**: Slower ⚠️

## Best Practices

### 1. Representative Sample

Select traces that represent:

- Different use cases
- Edge cases
- High-value interactions
- Different input lengths

### 2. Batch Size

Recommended batch sizes:

- **Small tests**: 10-50 traces
- **Pre-production**: 100-500 traces
- **Full validation**: 1000+ traces

### 3. Cost Monitoring

Before running large replays:

1. Test with 5-10 traces first
2. Check cost impact
3. Scale up gradually

### 4. Naming Convention

Use descriptive names:

- `gpt4-to-haiku-migration-2024-01`
- `prompt-v2-testing`
- `system-prompt-refinement`

## Troubleshooting

### "Anthropic API key not set"

**Solution:**

1. Add `ANTHROPIC_API_KEY` to `.env.docker`
2. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### "OpenAI API key not set"

**Solution:**

1. Add `OPENAI_API_KEY` to `.env.docker`
2. Restart services:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Simulation Mode (No Real API Calls)

If API keys aren't set, replay runs in simulation mode:

- Generates synthetic variations
- No real API costs
- Useful for testing the feature itself

To enable real LLM calls, add API keys as shown above.

### Replay Stuck at "Running"

1. Check replay service logs:
   ```bash
   docker logs lumina-replay
   ```
2. Verify API keys are valid
3. Check for rate limiting errors

## Security

### API Key Storage

- Store API keys in `.env.docker` (never commit to git)
- Use environment variables in production
- Rotate keys regularly

### Data Privacy

- Replay uses production trace data
- Responses are stored in the database
- Consider data retention policies

## Limits

### Self-Hosted

- **No replay limits** on number of replays
- **API costs** depend on your LLM provider usage
- **Concurrent replays**: 5 (configurable via `MAX_CONCURRENT_REPLAYS`)

### Managed Cloud

- Contact us for enterprise plans with:
  - Dedicated replay infrastructure
  - Higher concurrency limits
  - Priority API routing

## Next Steps

- 📊 [View cost analytics](http://localhost:3000/cost)
- 🚨 [Configure alerts](./ALERTS.md)
- 🔌 [Integration guides](./INTEGRATIONS.md)
- ❓ [FAQ](./FAQ.md)

---

**Questions?** Open a [GitHub Discussion](https://github.com/use-lumina/Lumina/discussions) or check the [FAQ](./FAQ.md).
