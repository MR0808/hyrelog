import { trace } from "@opentelemetry/api";
import { env } from "@/config/env";
let initialized = false;
/**
 * Initializes OpenTelemetry SDK.
 * Note: Full initialization requires compatible package versions.
 * For now, we provide basic trace ID generation.
 */
export const initOtel = () => {
    if (initialized) {
        return;
    }
    // Only initialize if endpoint is configured
    if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        initialized = true;
        return;
    }
    // TODO: Initialize full SDK when package versions are compatible
    // For now, we'll use basic trace ID generation
    initialized = true;
};
/**
 * Gets the current trace ID.
 */
export const getTraceId = () => {
    const span = trace.getActiveSpan();
    if (!span) {
        return undefined;
    }
    const spanContext = span.spanContext();
    return spanContext.traceId;
};
/**
 * Creates a new span.
 */
export const createSpan = (name, fn) => {
    const tracer = trace.getTracer(env.OTEL_SERVICE_NAME);
    return tracer.startActiveSpan(name, (span) => {
        try {
            return fn(span);
        }
        finally {
            span.end();
        }
    });
};
/**
 * Adds an event to the current span.
 */
export const addSpanEvent = (name, attributes) => {
    const span = trace.getActiveSpan();
    if (span) {
        span.addEvent(name, attributes);
    }
};
/**
 * Sets an attribute on the current span.
 */
export const setSpanAttribute = (key, value) => {
    const span = trace.getActiveSpan();
    if (span) {
        span.setAttribute(key, value);
    }
};
//# sourceMappingURL=otel.js.map