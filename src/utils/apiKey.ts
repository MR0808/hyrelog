// src/utils/apiKey.ts
import crypto from 'crypto';

export function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey() {
    const prefix = 'atk_' + crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(24).toString('hex');

    const fullKey = `${prefix}.${secret}`;
    const hashed = hashKey(fullKey);

    return { fullKey, prefix, hashed };
}
