"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = paginate;
async function paginate(args) {
    const { model, where, orderBy, cursor, limit = 100 } = args;
    // Enforce safe bounds
    const take = Math.min(Math.max(limit, 1), 500);
    const query = { where, orderBy, take };
    if (cursor) {
        query.skip = 1;
        query.cursor = { id: cursor };
    }
    const results = await model.findMany(query);
    let nextCursor = null;
    if (results.length === take) {
        const last = results[results.length - 1];
        nextCursor = last.id;
    }
    return { data: results, nextCursor };
}
