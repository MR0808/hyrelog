// src/utils/hashchain.ts
import { createHash } from 'crypto';
import { Json } from '../schemas/json';

export interface HashEventPayload {
    type: string;
    actorId?: string | null;
    actorType?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;

    metadata?: Json | null;
    before?: Json | null;
    after?: Json | null;

    prevHash?: string | null;
}

/**
 * Deterministic event hashing using SHA-256.
 */
export function buildEventHash(payload: HashEventPayload): string {
    const hash = createHash('sha256');

    const serialised = JSON.stringify({
        type: payload.type,
        actorId: payload.actorId ?? null,
        actorType: payload.actorType ?? null,
        actorName: payload.actorName ?? null,
        actorEmail: payload.actorEmail ?? null,
        metadata: payload.metadata ?? null,
        before: payload.before ?? null,
        after: payload.after ?? null
    });

    const input = `${payload.prevHash ?? ''}:${serialised}`;

    hash.update(input);

    return hash.digest('hex');
}
