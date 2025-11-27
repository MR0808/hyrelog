"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEventHash = computeEventHash;
const hash_1 = require("./hash");
function computeEventHash(payload) {
    return (0, hash_1.sha256)(JSON.stringify(payload));
}
