import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import { REPORT_ROOMS, buildReportWhere, parseDateRange, parseStatusFilter, type ReportRoom } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("reports", "read");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") as ReportRoom | null;
  if (!room || !(REPORT_ROOMS as readonly string[]).includes(room)) {
    return NextResponse.json({ error: "Parâmetro room inválido" }, { status: 400 });
  }

  const statusFilter = parseStatusFilter(searchParams);

  const range = parseDateRange(searchParams);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const { q, page, pageSize, skip } = parsePagination(req);
  const where = buildReportWhere({ room, statusFilter, range, q });

  const [items, total] = await Promise.all([
    prisma.schedulingEntry.findMany({ where, orderBy: { eventAt: "desc" }, skip, take: pageSize }),
    prisma.schedulingEntry.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize } satisfies PaginatedResult<(typeof items)[number]>);
}
