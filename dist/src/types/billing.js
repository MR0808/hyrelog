/**
 * Error raised when billing enforcement should reject an operation.
 */
export class BillingLimitError extends Error {
    checkpoint;
    constructor(message, checkpoint) {
        super(message);
        this.checkpoint = checkpoint;
        this.name = "BillingLimitError";
    }
}
//# sourceMappingURL=billing.js.map