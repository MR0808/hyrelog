const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
/**
 * Normalizes pagination query params to sane defaults.
 */
export const resolvePagination = (query, maxLimit = MAX_LIMIT) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), maxLimit);
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};
export const buildMeta = ({ page, limit, total, retentionApplied, retentionWindowStart, }) => ({
    page,
    limit,
    total,
    retentionApplied,
    retentionWindowStart,
});
export const buildPaginatedResponse = (items, meta) => ({
    data: items,
    meta,
});
export const withPagination = (args, pagination) => ({
    ...args,
    skip: pagination.offset,
    take: pagination.limit,
});
//# sourceMappingURL=pagination.js.map