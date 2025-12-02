import { type Span } from "@opentelemetry/api";
/**
 * Initializes OpenTelemetry SDK.
 * Note: Full initialization requires compatible package versions.
 * For now, we provide basic trace ID generation.
 */
export declare const initOtel: () => void;
/**
 * Gets the current trace ID.
 */
export declare const getTraceId: () => string | undefined;
/**
 * Creates a new span.
 */
export declare const createSpan: <T>(name: string, fn: (span: Span) => T) => T;
/**
 * Adds an event to the current span.
 */
export declare const addSpanEvent: (name: string, attributes?: Record<string, string | number>) => void;
/**
 * Sets an attribute on the current span.
 */
export declare const setSpanAttribute: (key: string, value: string | number | boolean) => void;
//# sourceMappingURL=otel.d.ts.map