---
layout: default
title: Integrations
nav_order: 3
has_children: true
permalink: /integrations
---

# Integration Guides

Learn how to integrate Lumina with your LLM applications.

## Supported Providers

- [OpenAI](./INTEGRATIONS#openai)
- [Anthropic (Claude)](./INTEGRATIONS#anthropic)
- [LangChain](./INTEGRATIONS#langchain)
- [Vercel AI SDK](./INTEGRATIONS#vercel-ai-sdk)

## Quick Start Pattern

All integrations follow a simple pattern:

1. Install the SDK: `npm install @uselumina/sdk`
2. Initialize the client
3. Wrap your LLM calls with `traceLLM()`
4. View traces in the dashboard

## Next Steps

- See [Full Integration Guide](./INTEGRATIONS) for detailed examples
- Check [API Reference](../api/API_REFERENCE) for advanced configuration
