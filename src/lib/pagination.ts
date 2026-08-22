import type { NextRequest } from "next/server";

// Hard ceiling for any single request — the residents/users tables always ask
// for 20 (per the product spec); a higher pageSize is only used to populate
// pickers (e.g. the tenant form's "Proprietário" select).
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  q?: string;
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePagination(req: NextRequest): PaginationParams {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || MAX_PAGE_SIZE));
  return { q, page, pageSize, skip: (page - 1) * pageSize };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
