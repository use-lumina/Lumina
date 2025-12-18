#!/bin/bash

# Get current time in nanoseconds for OTLP timestamps
NOW_NANOS=$(date +%s)000000000

# Send baseline traces (10 traces with cost around $0.001)
echo "Sending 10 baseline traces..."
for i in {1..10}; do
  START_TIME=$(($NOW_NANOS - $(($i * 1000000000))))
  END_TIME=$(($START_TIME + 500000000))

  curl -s -X POST http://localhost:3001/v1/traces \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer lumina_test_customer_abc123" \
    -d "{
    \"resourceSpans\": [{
      \"resource\": {
        \"attributes\": [
          {\"key\": \"service.name\", \"value\": {\"stringValue\": \"rag-assistant\"}}
        ]
      },
      \"scopeSpans\": [{
        \"scope\": {\"name\": \"lumina-sdk\"},
        \"spans\": [{
          \"traceId\": \"baseline${i}000000000000000000000000\",
          \"spanId\": \"baseline${i}0000000\",
          \"name\": \"/api/chat\",
          \"startTimeUnixNano\": \"${START_TIME}\",
          \"endTimeUnixNano\": \"${END_TIME}\",
          \"attributes\": [
            {\"key\": \"gen_ai.system\", \"value\": {\"stringValue\": \"openai\"}},
            {\"key\": \"gen_ai.request.model\", \"value\": {\"stringValue\": \"gpt-3.5-turbo\"}},
            {\"key\": \"gen_ai.prompt\", \"value\": {\"stringValue\": \"Simple query ${i}\"}},
            {\"key\": \"gen_ai.completion\", \"value\": {\"stringValue\": \"Simple response ${i}\"}},
            {\"key\": \"gen_ai.usage.prompt_tokens\", \"value\": {\"intValue\": 20}},
            {\"key\": \"gen_ai.usage.completion_tokens\", \"value\": {\"intValue\": 15}},
            {\"key\": \"lumina.environment\", \"value\": {\"stringValue\": \"live\"}},
            {\"key\": \"lumina.cost_usd\", \"value\": {\"doubleValue\": 0.001}}
          ],
          \"status\": {\"code\": 1}
        }]
      }]
    }]
  }" > /dev/null
  echo "Baseline trace $i sent"
done

echo ""
echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "Sending cost spike trace (15x baseline cost)..."
SPIKE_START=$(($NOW_NANOS + 1000000000))
SPIKE_END=$(($SPIKE_START + 500000000))

curl -s -X POST http://localhost:3001/v1/traces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lumina_test_customer_abc123" \
  -d "{
  \"resourceSpans\": [{
    \"resource\": {
      \"attributes\": [
        {\"key\": \"service.name\", \"value\": {\"stringValue\": \"rag-assistant\"}}
      ]
    },
    \"scopeSpans\": [{
      \"scope\": {\"name\": \"lumina-sdk\"},
      \"spans\": [{
        \"traceId\": \"spike00000000000000000000000000000\",
        \"spanId\": \"spike0000000000a\",
        \"name\": \"/api/chat\",
        \"startTimeUnixNano\": \"${SPIKE_START}\",
        \"endTimeUnixNano\": \"${SPIKE_END}\",
        \"attributes\": [
          {\"key\": \"gen_ai.system\", \"value\": {\"stringValue\": \"openai\"}},
          {\"key\": \"gen_ai.request.model\", \"value\": {\"stringValue\": \"gpt-4\"}},
          {\"key\": \"gen_ai.prompt\", \"value\": {\"stringValue\": \"Complex query requiring lots of tokens\"}},
          {\"key\": \"gen_ai.completion\", \"value\": {\"stringValue\": \"Very detailed response with many tokens\"}},
          {\"key\": \"gen_ai.usage.prompt_tokens\", \"value\": {\"intValue\": 500}},
          {\"key\": \"gen_ai.usage.completion_tokens\", \"value\": {\"intValue\": 800}},
          {\"key\": \"lumina.environment\", \"value\": {\"stringValue\": \"live\"}},
          {\"key\": \"lumina.cost_usd\", \"value\": {\"doubleValue\": 0.015}}
        ],
        \"status\": {\"code\": 1}
      }]
    }]
  }]
}"

echo ""
echo "Done! Check ingestion service logs for alert generation."
