"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceInfo = void 0;
const zod_1 = require("zod");
exports.WorkspaceInfo = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string()
});
