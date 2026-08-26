import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { parsePagination } from "@/lib/pagination";
import { REPORT_ROOMS, buildReportWhere, parseDateRange, parseStatusFilter, type ReportRoom } from "@/lib/reports";
import { buildSchedulingReportPdf } from "@/lib/pdf/scheduling-report";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePermission("reports", "create");
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
  if (!range.startDate || !range.endDate) {
    return NextResponse.json({ error: "Informe a data inicial e a data final para gerar o relatório" }, { status: 400 });
  }

  const { q } = parsePagination(req);
  const where = buildReportWhere({ room, statusFilter, range, q });
  const entries = await prisma.schedulingEntry.findMany({ where, orderBy: { eventAt: "desc" } });

  const pdfBytes = await buildSchedulingReportPdf({
    room,
    statusFilter,
    range,
    entries,
    generatedBy: session.user.name ?? "—",
  });

  // Includes seconds so two reports the same minute don't collide.
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fileName = `relatorio-${room.toLowerCase().replace("_", "-")}-${timestamp}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
