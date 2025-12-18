/**
 * OpenTelemetry Protocol (OTLP) Type Definitions
 * Based on: https://opentelemetry.io/docs/specs/otlp/
 */

/**
 * OTLP Trace Request Format (HTTP/JSON)
 */
export interface OTLPTraceRequest {
  resourceSpans: OTLPResourceSpan[];
}

export interface OTLPResourceSpan {
  resource?: {
    attributes: OTLPAttribute[];
    droppedAttributesCount?: number;
  };
  scopeSpans: OTLPScopeSpan[];
  schemaUrl?: string;
}

export interface OTLPScopeSpan {
  scope?: {
    name: string;
    version?: string;
    attributes?: OTLPAttribute[];
  };
  spans: OTLPSpan[];
  schemaUrl?: string;
}

export interface OTLPSpan {
  traceId: string; // 32-char hex string
  spanId: string; // 16-char hex string
  parentSpanId?: string;
  name: string;
  kind: OTLPSpanKind;
  startTimeUnixNano: string; // int64 as string
  endTimeUnixNano: string; // int64 as string
  attributes: OTLPAttribute[];
  events?: OTLPEvent[];
  links?: OTLPLink[];
  status: OTLPStatus;
  droppedAttributesCount?: number;
  droppedEventsCount?: number;
  droppedLinksCount?: number;
  traceState?: string;
}

export enum OTLPSpanKind {
  SPAN_KIND_UNSPECIFIED = 0,
  SPAN_KIND_INTERNAL = 1,
  SPAN_KIND_SERVER = 2,
  SPAN_KIND_CLIENT = 3,
  SPAN_KIND_PRODUCER = 4,
  SPAN_KIND_CONSUMER = 5,
}

export interface OTLPAttribute {
  key: string;
  value: OTLPAnyValue;
}

export interface OTLPAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string; // int64 as string
  doubleValue?: number;
  arrayValue?: OTLPArrayValue;
  kvlistValue?: OTLPKeyValueList;
  bytesValue?: string; // base64 encoded
}

export interface OTLPArrayValue {
  values: OTLPAnyValue[];
}

export interface OTLPKeyValueList {
  values: OTLPAttribute[];
}

export interface OTLPEvent {
  timeUnixNano: string; // int64 as string
  name: string;
  attributes?: OTLPAttribute[];
  droppedAttributesCount?: number;
}

export interface OTLPLink {
  traceId: string;
  spanId: string;
  traceState?: string;
  attributes?: OTLPAttribute[];
  droppedAttributesCount?: number;
}

export interface OTLPStatus {
  code: OTLPStatusCode;
  message?: string;
}

export enum OTLPStatusCode {
  STATUS_CODE_UNSET = 0,
  STATUS_CODE_OK = 1,
  STATUS_CODE_ERROR = 2,
}

/**
 * Parsed span with flattened attributes
 * (Intermediate format for easier processing)
 */
export interface ParsedOTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: OTLPSpanKind;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Record<string, unknown>; // Flattened attributes
  resourceAttributes: Record<string, unknown>; // Resource-level attributes
  status: OTLPStatus;
  events: OTLPEvent[];
  links: OTLPLink[];
}
