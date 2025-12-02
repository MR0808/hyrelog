/**
 * Cleans stale SSE clients and advances last event pointer.
 * Runs every 5 minutes.
 *
 * Note: In a production system, you'd maintain a registry of active SSE connections.
 * This is a placeholder for that functionality.
 */
export declare const runTailCleaner: () => Promise<void>;
//# sourceMappingURL=tailCleaner.d.ts.map