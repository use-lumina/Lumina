"""
Lumina + Anthropic (Claude) Basic Integration Example

Setup:
  1. Start Lumina: cd ../../../infra/docker && docker-compose up -d
  2. pip install -r requirements.txt
  3. export ANTHROPIC_API_KEY=sk-ant-...
  4. python main.py
"""

import asyncio
import os

import anthropic
from lumina import init_lumina

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# Initialize Lumina (no API key needed for self-hosted!)
lumina = init_lumina({
    "endpoint": os.environ.get("LUMINA_ENDPOINT", "http://localhost:8080/v1/traces"),
    "service_name": "anthropic-basic-example",
    "environment": "live",
})


def chat_with_claude(prompt: str) -> str:
    print(f"\nSending prompt: {prompt}")

    # Wrap your Anthropic call with lumina.trace_llm()
    response = lumina.trace_llm(
        lambda: client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        ),
        name="chat-completion",
        system="anthropic",
        prompt=prompt,
        tags=["chat", "example"],
        metadata={"max_tokens": 150},
    )

    message = response.content[0].text if response.content else "No response"
    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    cost = input_tokens * 0.000003 + output_tokens * 0.000015
    print(f"Response: {message}")
    print(f"Cost: ${cost:.6f}")
    print(f"Tokens: {input_tokens} input + {output_tokens} output = {input_tokens + output_tokens} total")
    print("Trace sent to Lumina!")
    return message


def main():
    print("Lumina + Anthropic (Claude) Integration Example")
    print("=" * 50)

    chat_with_claude("What is the capital of France?")
    chat_with_claude("Explain quantum computing in one sentence.")
    chat_with_claude("Write a haiku about observability.")

    print("\nFlushing traces...")
    asyncio.run(lumina.flush())
    print("All traces flushed!")

    print("\nDone! Check your traces at http://localhost:3000/traces")


if __name__ == "__main__":
    main()
