import { trace, type Span, context, SpanStatusCode } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { env } from "@/config/env";

let sdk: NodeSDK | null = null;

/**
 * Initializes OpenTelemetry SDK.
 * Sets up tracing, metrics, and logging instrumentation.
 */
export function initOtel(): void {
  if (sdk) {
    return; // Already initialized
  }

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
    }),
  );

  const traceExporter = env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      })
    : undefined;

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      new FastifyInstrumentation(),
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => {
          // Ignore health checks
          return req.url?.includes("/healthz") ?? false;
        },
      }),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
}

/**
 * Gets the current trace ID.
 */
export const getTraceId = (): string | undefined => {
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
export const createSpan = <T>(name: string, fn: (span: Span) => T): T => {
  const tracer = trace.getTracer(env.OTEL_SERVICE_NAME);
  return tracer.startActiveSpan(name, (span) => {
    try {
      return fn(span);
    } finally {
      span.end();
    }
  });
};

/**
 * Creates an async span.
 */
export const createAsyncSpan = async <T>(
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> => {
  const tracer = trace.getTracer(env.OTEL_SERVICE_NAME);
  return tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
};

/**
 * Adds an event to the current span.
 */
export const addSpanEvent = (
  name: string,
  attributes?: Record<string, string | number | boolean>,
): void => {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
};

/**
 * Sets an attribute on the current span.
 */
export const setSpanAttribute = (key: string, value: string | number | boolean): void => {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
};

/**
 * Sets multiple attributes on the current span.
 */
export const setSpanAttributes = (attributes: Record<string, string | number | boolean>): void => {
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
export const recordSpanException = (error: Error, attributes?: Record<string, string | number>): void => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
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
export const withSpanContext = <T>(spanContext: any, fn: () => T): T => {
  return context.with(trace.setSpanContext(context.active(), spanContext), fn);
};
