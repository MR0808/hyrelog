"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyInfoResponse = void 0;
const zod_1 = require("zod");
exports.CompanyInfoResponse = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    eventsPerMonth: zod_1.z.number(),
    exportsPerMonth: zod_1.z.number(),
    retentionDays: zod_1.z.number(),
    unlimitedRetention: zod_1.z.boolean()
});
