"use strict";
// src/sdk/error.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyreLogError = void 0;
class HyreLogError extends Error {
    constructor(message, status, code, body) {
        super(message);
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
exports.HyreLogError = HyreLogError;
