// @lumina/sdk - User-facing instrumentation library

// Main SDK class
export { Lumina, initLumina, getLumina } from './lumina';

// Core components (for advanced use)
export { Tracer } from './tracer';
export { HttpExporter } from './exporter';

// Utilities
export { generateTraceId, generateSpanId, hashResponse } from './utils';

// Re-export types from schema for convenience
export type { Trace, Span, Alert, IngestRequest, IngestResponse } from '@lumina/schema';

export type { SdkConfig } from '@lumina/config';
