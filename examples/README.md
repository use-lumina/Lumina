# Lumina Examples

End-to-end examples demonstrating Lumina LLM observability across TypeScript and Python.

## Structure

```
examples/
├── typescript/
│   ├── openai-basic/       # OpenAI + @uselumina/sdk (Node/Bun)
│   ├── anthropic-basic/    # Anthropic Claude + @uselumina/sdk (Node/Bun)
│   └── nextjs-rag/         # Full RAG app with Next.js + Anthropic
└── python/
    ├── openai-basic/       # OpenAI + lumina-sdk
    └── anthropic-basic/    # Anthropic Claude + lumina-sdk
```

## Prerequisites

All examples require Lumina running locally:

```bash
cd ../infra/docker
docker-compose up -d

# Verify
curl http://localhost:8080/health
# {"status":"ok","service":"lumina-ingestion"}
```

Then open the dashboard at http://localhost:3000.

---

## TypeScript Examples

Install dependencies with [Bun](https://bun.sh):

### OpenAI

```bash
cd typescript/openai-basic
bun install
export OPENAI_API_KEY=sk-...
bun run start
```

### Anthropic

```bash
cd typescript/anthropic-basic
bun install
export ANTHROPIC_API_KEY=sk-ant-...
bun run start
```

### Next.js RAG

```bash
cd typescript/nextjs-rag
bun install
cp .env.example .env.local   # fill in your keys
bun run dev
# Open http://localhost:3001
```

---

## Python Examples

Requires Python 3.9+.

### OpenAI

```bash
cd python/openai-basic
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
python main.py
```

### Anthropic

```bash
cd python/anthropic-basic
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python main.py
```

---

## Key Pattern

Every example follows the same two-step integration:

**TypeScript**
```typescript
import { Lumina } from '@uselumina/sdk';

const lumina = new Lumina({ endpoint: 'http://localhost:8080/v1/traces' });

const response = await lumina.traceLLM(
  () => openai.chat.completions.create({ model: 'gpt-4', messages: [...] }),
  { name: 'my-call', system: 'openai' }
);
```

**Python**
```python
from lumina import init_lumina

lumina = init_lumina({"endpoint": "http://localhost:8080/v1/traces"})

response = lumina.trace_llm(
    lambda: client.chat.completions.create(model="gpt-4", messages=[...]),
    name="my-call",
    system="openai",
)
```

Both SDKs automatically extract model, tokens, cost, and latency from the response.
