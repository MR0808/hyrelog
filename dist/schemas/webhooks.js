"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWebhookSchema = void 0;
// src/schemas/webhook.ts
const zod_1 = require("zod");
exports.UpdateWebhookSchema = zod_1.z.object({
    url: zod_1.z.url(),
    secret: zod_1.z.string().min(16)
});
