"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJson = toJson;
// src/utils/toJson.ts
const client_1 = require("../generated/prisma/client");
/**
 * Convert arbitrary JS values into Prisma JSON type safely.
 *
 * Prisma 7 JSON rules:
 *  - Use Prisma.JsonNull for JSON `null`
 *  - Use undefined to omit a field
 *  - Use regular JS values for valid JSON
 */
function toJson(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        // JSON null, NOT DB null
        return client_1.Prisma.JsonNull;
    }
    return value;
}
