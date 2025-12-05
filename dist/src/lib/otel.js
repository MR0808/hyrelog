import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import * as resources from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { env } from '@/config/env';
let sdk = null;
/**
 * Initializes OpenTelemetry SDK.
 * Sets up tracing, metrics, and logging instrumentation.
 */
export function initOtel() {
    if (sdk) {
        return; // Already initialized
    }
    // Use resourceFromAttributes to create a resource with attributes
    const defaultRes = resources.defaultResource();
    const customRes = resources.resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV
    });
    const resource = defaultRes.merge(customRes);
    const traceExporter = env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? new OTLPTraceExporter({
            url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
        })
        : undefined;
    const sdkConfig = {
        resource,
        instrumentations: [
            new FastifyInstrumentation(),
            new HttpInstrumentation({
                ignoreIncomingRequestHook: (req) => {
                    // Ignore health checks
                    return req.url?.includes('/healthz') ?? false;
                }
            }),
            new PrismaInstrumentation()
        ]
    };
    if (traceExporter) {
        sdkConfig.traceExporter = traceExporter;
    }
    sdk = new NodeSDK(sdkConfig);
    sdk.start();
}
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
 * Creates an async span.
 */
export const createAsyncSpan = async (name, fn) => {
    const tracer = trace.getTracer(env.OTEL_SERVICE_NAME);
    return tracer.startActiveSpan(name, async (span) => {
        try {
            return await fn(span);
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error)
            });
            throw error;
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
/**
 * Sets multiple attributes on the current span.
 */
export const setSpanAttributes = (attributes) => {
    const span = trace.getActiveSpan();
    if (span) {
        Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
        });
    }
};
/**
 * Records an exception on the current span.
 */
export const recordSpanException = (error, attributes) => {
    const span = trace.getActiveSpan();
    if (span) {
        span.recordException(error);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
        });
        if (attributes) {
            setSpanAttributes(attributes);
        }
    }
};
/**
 * Gets the current span context for propagation.
 */
export const getSpanContext = () => {
    const span = trace.getActiveSpan();
    return span?.spanContext();
};
/**
 * Runs a function with a span context (for async operations).
 */
export const withSpanContext = (spanContext, fn) => {
    return context.with(trace.setSpanContext(context.active(), spanContext), fn);
};
//# sourceMappingURL=otel.js.map