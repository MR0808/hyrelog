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

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

/**
 * Normalizes pagination query params to sane defaults.
 */
export const resolvePagination = (query: PaginationQuery, maxLimit = MAX_LIMIT): PaginationResult => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  retentionApplied: boolean;
  retentionWindowStart: Date;
};

export const buildMeta = ({
  page,
  limit,
  total,
  retentionApplied,
  retentionWindowStart,
}: PaginationMeta) => ({
  page,
  limit,
  total,
  retentionApplied,
  retentionWindowStart,
});

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export const buildPaginatedResponse = <T>(
  items: T[],
  meta: PaginationMeta,
): PaginatedResponse<T> => ({
  data: items,
  meta,
});

export const withPagination = <T extends Prisma.AuditEventFindManyArgs>(
  args: T,
  pagination: PaginationResult,
): T => ({
  ...args,
  skip: pagination.offset,
  take: pagination.limit,
});

