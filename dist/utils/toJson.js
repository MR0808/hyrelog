"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJson = toJson;
const client_1 = require("../generated/prisma/client");
/**
 * Safely cast arbitrary JSON-like values into Prisma JSON-compatible values.
 * Prisma 7 requires DbNull for explicit JSON null writes.
 */
function toJson(value) {
    if (value === undefined || value === null) {
        return client_1.Prisma.NullTypes.DbNull;
    }
    return value;
}
