import { type Span } from '@opentelemetry/api';
/**
 * Initializes OpenTelemetry SDK.
 * Sets up tracing, metrics, and logging instrumentation.
 */
export declare function initOtel(): void;
/**
 * Gets the current trace ID.
 */
export declare const getTraceId: () => string | undefined;
/**
 * Creates a new span.
 */
export declare const createSpan: <T>(name: string, fn: (span: Span) => T) => T;
/**
 * Creates an async span.
 */
export declare const createAsyncSpan: <T>(name: string, fn: (span: Span) => Promise<T>) => Promise<T>;
/**
 * Adds an event to the current span.
 */
export declare const addSpanEvent: (name: string, attributes?: Record<string, string | number | boolean>) => void;
/**
 * Sets an attribute on the current span.
 */
export declare const setSpanAttribute: (key: string, value: string | number | boolean) => void;
/**
 * Sets multiple attributes on the current span.
 */
export declare const setSpanAttributes: (attributes: Record<string, string | number | boolean>) => void;
/**
 * Records an exception on the current span.
 */
export declare const recordSpanException: (error: Error, attributes?: Record<string, string | number>) => void;
/**
 * Gets the current span context for propagation.
 */
export declare const getSpanContext: () => import("@opentelemetry/api").SpanContext | undefined;
/**
 * Runs a function with a span context (for async operations).
 */
export declare const withSpanContext: <T>(spanContext: any, fn: () => T) => T;
//# sourceMappingURL=otel.d.ts.map