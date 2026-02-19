"""
Lumina + OpenAI Basic Integration Example

Setup:
  1. Start Lumina: cd ../../../infra/docker && docker-compose up -d
  2. pip install -r requirements.txt
  3. export OPENAI_API_KEY=sk-...
  4. python main.py
"""

import asyncio
import os

import openai
from lumina import init_lumina

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Initialize Lumina (no API key needed for self-hosted!)
lumina = init_lumina({
    "endpoint": os.environ.get("LUMINA_ENDPOINT", "http://localhost:8080/v1/traces"),
    "service_name": "openai-basic-example",
    "environment": "live",
})


def chat_with_openai(prompt: str) -> str:
    print(f"\nSending prompt: {prompt}")

    # Wrap your OpenAI call with lumina.trace_llm()
    response = lumina.trace_llm(
        lambda: client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150,
        ),
        name="chat-completion",
        system="openai",
        prompt=prompt,
        tags=["chat", "example"],
        metadata={"temperature": 0.7, "max_tokens": 150},
    )

    message = response.choices[0].message.content or "No response"
    total_tokens = response.usage.total_tokens if response.usage else 0
    print(f"Response: {message}")
    print(f"Cost: ${total_tokens * 0.00003:.6f}")
    print(f"Tokens: {total_tokens}")
    print("Trace sent to Lumina!")
    return message


def main():
    print("Lumina + OpenAI Integration Example")
    print("=" * 50)

    chat_with_openai("What is the capital of France?")
    chat_with_openai("Explain quantum computing in one sentence.")

    print("\nFlushing traces...")
    asyncio.run(lumina.flush())
    print("All traces flushed!")

    print("\nDone! Check your traces at http://localhost:3000/traces")


if __name__ == "__main__":
    main()
