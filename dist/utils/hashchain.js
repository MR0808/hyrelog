"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEventHash = buildEventHash;
// src/utils/hashchain.ts
const crypto_1 = require("crypto");
/**
 * Deterministic event hashing using SHA-256.
 */
function buildEventHash(payload) {
    const hash = (0, crypto_1.createHash)('sha256');
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
