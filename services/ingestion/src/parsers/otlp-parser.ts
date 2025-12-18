import type { OTLPTraceRequest, OTLPAttribute, OTLPAnyValue, ParsedOTLPSpan } from '@lumina/schema';

/**
 * Parse OTLP trace request and extract spans with flattened attributes
 */
export function parseOTLPTraces(otlpData: OTLPTraceRequest): ParsedOTLPSpan[] {
  const spans: ParsedOTLPSpan[] = [];

  for (const resourceSpan of otlpData.resourceSpans || []) {
    // Extract resource-level attributes (service info, etc.)
    const resourceAttributes = parseAttributes(resourceSpan.resource?.attributes || []);

    for (const scopeSpan of resourceSpan.scopeSpans || []) {
      for (const span of scopeSpan.spans || []) {
        // Extract span-level attributes
        const spanAttributes = parseAttributes(span.attributes || []);

        // Combine resource + span attributes
        // Span attributes take precedence over resource attributes
        const allAttributes = { ...resourceAttributes, ...spanAttributes };

        spans.push({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          name: span.name,
          kind: span.kind,
          startTimeUnixNano: span.startTimeUnixNano,
          endTimeUnixNano: span.endTimeUnixNano,
          attributes: allAttributes,
          resourceAttributes,
          status: span.status,
          events: span.events || [],
          links: span.links || [],
        });
      }
    }
  }

  return spans;
}

/**
 * Parse OTLP attributes into flat key-value object
 * Handles nested structures and different value types
 */
export function parseAttributes(attrs: OTLPAttribute[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const attr of attrs) {
    const key = attr.key;
    const value = parseAnyValue(attr.value);
    result[key] = value;
  }

  return result;
}

/**
 * Parse OTLP AnyValue type into JavaScript value
 */
function parseAnyValue(value: OTLPAnyValue): unknown {
  // String value
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }

  // Boolean value
  if (value.boolValue !== undefined) {
    return value.boolValue;
  }

  // Integer value (comes as string for int64)
  if (value.intValue !== undefined) {
    return parseInt(value.intValue, 10);
  }

  // Double value
  if (value.doubleValue !== undefined) {
    return value.doubleValue;
  }

  // Array value
  if (value.arrayValue) {
    return value.arrayValue.values.map((v) => parseAnyValue(v));
  }

  // Key-value list (object)
  if (value.kvlistValue) {
    return parseAttributes(value.kvlistValue.values);
  }

  // Bytes value (base64 encoded)
  if (value.bytesValue !== undefined) {
    return value.bytesValue;
  }

  return null;
}

/**
 * Extract a specific attribute from parsed span
 */
export function getSpanAttribute(span: ParsedOTLPSpan, key: string): unknown {
  return span.attributes[key];
}

/**
 * Extract string attribute with fallback
 */
export function getStringAttribute(span: ParsedOTLPSpan, key: string, fallback = ''): string {
  const value = span.attributes[key];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Extract number attribute with fallback
 */
export function getNumberAttribute(span: ParsedOTLPSpan, key: string, fallback = 0): number {
  const value = span.attributes[key];
  return typeof value === 'number' ? value : fallback;
}
