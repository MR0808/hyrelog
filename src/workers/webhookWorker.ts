import { prisma } from "@/lib/prisma";
import { signWebhookPayload, formatSignatureHeader } from "@/lib/webhookSignature";
import { getTraceId } from "@/lib/otel";
import { WebhookDeliveryStatus } from "@prisma/client";

/**
 * Exponential backoff delays in milliseconds.
 */
const BACKOFF_DELAYS = [
  0, // 1st attempt: immediate
  60 * 1000, // 2nd: +1 minute
  5 * 60 * 1000, // 3rd: +5 minutes
  30 * 60 * 1000, // 4th: +30 minutes
  6 * 60 * 60 * 1000, // 5th: +6 hours
];

/**
 * Calculates next attempt time based on attempt number.
 */
const calculateNextAttempt = (attempts: number): Date => {
  const delayIndex = Math.min(attempts, BACKOFF_DELAYS.length - 1);
  const delayMs = BACKOFF_DELAYS[delayIndex]!;
  return new Date(Date.now() + delayMs);
};

/**
 * Delivers a webhook payload.
 */
const deliverWebhook = async (
  webhook: { url: string; secret: string },
  event: { id: string; [key: string]: unknown },
): Promise<{ success: boolean; statusCode?: number; responseBody?: string }> => {
  const payload = JSON.stringify(event);
  const signature = signWebhookPayload(payload, webhook.secret);
  const traceId = getTraceId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "HyreLog-Signature": formatSignatureHeader(signature),
  };

  if (traceId) {
    headers["HyreLog-Trace-Id"] = traceId;
  }

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payload,
    });

    const responseBody = await response.text().catch(() => "");

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000), // Limit stored response size
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 0,
      responseBody: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Processes pending webhook deliveries.
 */
export const processWebhookDeliveries = async (): Promise<number> => {
  const now = new Date();

  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      OR: [
        { status: WebhookDeliveryStatus.PENDING },
        {
          status: WebhookDeliveryStatus.FAILED,
          nextAttemptAt: {
            lte: now,
          },
        },
      ],
    },
    include: {
      webhook: true,
      event: true,
    },
    take: 100, // Process in batches
  });

  let processed = 0;

  for (const delivery of deliveries) {
    if (!delivery.webhook.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          responseBody: "Webhook is inactive",
        },
      });
      continue;
    }

    const attempts = delivery.attempts + 1;
    const result = await deliverWebhook(delivery.webhook, delivery.event);

    const isFinalFailure = attempts >= 5;
    const nextAttemptAt = isFinalFailure ? null : calculateNextAttempt(attempts);

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempts,
        status: result.success
          ? WebhookDeliveryStatus.SUCCESS
          : isFinalFailure
            ? WebhookDeliveryStatus.FAILED
            : WebhookDeliveryStatus.PENDING,
        lastAttemptAt: new Date(),
        nextAttemptAt,
        responseStatus: result.statusCode ?? null,
        responseBody: result.responseBody ?? null,
      },
    });

    processed++;
  }

  return processed;
};

/**
 * Main worker loop.
 */
const run = async () => {
  console.log("Webhook worker started");

  while (true) {
    try {
      const processed = await processWebhookDeliveries();
      if (processed > 0) {
        console.log(`Processed ${processed} webhook deliveries`);
      }
    } catch (error) {
      console.error("Error processing webhooks:", error);
    }

    // Wait 1 minute before next iteration
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  }
};

// Always run when executed directly
void run();

