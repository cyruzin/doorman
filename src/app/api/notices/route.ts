import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { noticeSchema } from "@/lib/validations/notices";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import { parseDateRange } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("notices", "read");
  if (error) return error;

  const { page, pageSize, skip } = parsePagination(req);

  const range = parseDateRange(new URL(req.url).searchParams);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const where = {
    ...(range.startDate || range.endDate
      ? { createdAt: { ...(range.startDate ? { gte: range.startDate } : {}), ...(range.endDate ? { lte: range.endDate } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.notice.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.notice.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize } satisfies PaginatedResult<(typeof items)[number]>);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePermission("notices", "create");
  if (error) return error;

  const parsed = noticeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const notice = await prisma.notice.create({
    data: {
      message: parsed.data.message,
      showOnHome: parsed.data.showOnHome,
      authorUsername: session.user.name ?? "—",
    },
  });
  return NextResponse.json(notice, { status: 201 });
}
