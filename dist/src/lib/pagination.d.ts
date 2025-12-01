import type { Prisma } from "@prisma/client";
export type PaginationQuery = {
    page?: number | string;
    limit?: number | string;
};
export type PaginationResult = {
    page: number;
    limit: number;
    offset: number;
};
/**
 * Normalizes pagination query params to sane defaults.
 */
export declare const resolvePagination: (query: PaginationQuery, maxLimit?: number) => PaginationResult;
export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    retentionApplied: boolean;
    retentionWindowStart: Date;
};
export declare const buildMeta: ({ page, limit, total, retentionApplied, retentionWindowStart, }: PaginationMeta) => {
    page: number;
    limit: number;
    total: number;
    retentionApplied: boolean;
    retentionWindowStart: Date;
};
export type PaginatedResponse<T> = {
    data: T[];
    meta: PaginationMeta;
};
export declare const buildPaginatedResponse: <T>(items: T[], meta: PaginationMeta) => PaginatedResponse<T>;
export declare const withPagination: <T extends Prisma.AuditEventFindManyArgs>(args: T, pagination: PaginationResult) => T;
//# sourceMappingURL=pagination.d.ts.map