/**
 * Generates HMAC SHA256 signature for webhook payload.
 */
export declare const signWebhookPayload: (payload: string, secret: string) => string;
/**
 * Verifies webhook signature.
 */
export declare const verifyWebhookSignature: (payload: string, signature: string, secret: string) => boolean;
/**
 * Formats signature header value.
 */
export declare const formatSignatureHeader: (signature: string) => string;
/**
 * Extracts signature from header value.
 */
export declare const extractSignatureFromHeader: (headerValue: string) => string | null;
//# sourceMappingURL=webhookSignature.d.ts.map