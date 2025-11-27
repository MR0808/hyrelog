"use strict";
// src/utils/retention.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRetentionWindow = getRetentionWindow;
exports.applyRetentionFilter = applyRetentionFilter;
/**
 * Apply retention-based filtering to event queries.
 *
 * Retention applies ONLY to READS, not writes.
 *
 * Example retention periods:
 * - Free: 7 days
 * - Standard: 30 days
 * - Pro: 90 days
 * - Unlimited: null (no limit)
 */
function getRetentionWindow(scope) {
    switch (scope.plan) {
        case 'FREE':
            return 7; // days
        case 'STANDARD':
            return 30;
        case 'PRO':
            return 90;
        case 'UNLIMITED':
        default:
            return null; // no retention filter
    }
}
/**
 * Adds retention filter into Prisma `where` clause if needed.
 */
function applyRetentionFilter(where, api) {
    const days = getRetentionWindow(api);
    if (!days) {
        return where; // unlimited retention
    }
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    if (!where.timestamp)
        where.timestamp = {};
    where.timestamp.gte = cutoff;
    return where;
}
