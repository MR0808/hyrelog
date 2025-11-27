// src/utils/webhook-signature.ts
import crypto from 'crypto';

export function signWebhook(secret: string, payload: unknown): string {
    const body = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhookSignature(
    secret: string,
    payload: unknown,
    signature: string
): boolean {
    const expected = signWebhook(secret, payload);
    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
    );
}
