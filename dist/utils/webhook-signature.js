"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signWebhook = signWebhook;
exports.verifyWebhookSignature = verifyWebhookSignature;
// src/utils/webhook-signature.ts
const crypto_1 = __importDefault(require("crypto"));
function signWebhook(secret, payload) {
    const body = JSON.stringify(payload);
    return crypto_1.default.createHmac('sha256', secret).update(body).digest('hex');
}
function verifyWebhookSignature(secret, payload, signature) {
    const expected = signWebhook(secret, payload);
    return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
