import crypto from "node:crypto";

/**
 * Generates HMAC SHA256 signature for webhook payload.
 */
export const signWebhookPayload = (payload: string, secret: string): string => {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Verifies webhook signature.
 */
export const verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
  const expectedSignature = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

/**
 * Formats signature header value.
 */
export const formatSignatureHeader = (signature: string): string => {
  return `sha256=${signature}`;
};

/**
 * Extracts signature from header value.
 */
export const extractSignatureFromHeader = (headerValue: string): string | null => {
  const match = headerValue.match(/sha256=([a-f0-9]{64})/i);
  return match ? match[1]! : null;
};

