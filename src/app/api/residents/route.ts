import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { residentSchema } from "@/lib/validations/resident";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import { contactNestedWrites } from "@/lib/contact-writes";
import { resolveResidentOwner } from "@/lib/resident-owner";

const residentInclude = { phones: true, vehicles: true, owner: { select: { id: true, name: true } } } as const;

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("residents", "read");
  if (error) return error;

  const { q, page, pageSize, skip } = parsePagination(req);
  const status = new URL(req.url).searchParams.get("status") ?? "active";

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q };
  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;

  const [items, total] = await Promise.all([
    prisma.resident.findMany({ where, include: residentInclude, orderBy: { name: "asc" }, skip, take: pageSize }),
    prisma.resident.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize } satisfies PaginatedResult<unknown>);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("residents", "create");
  if (error) return error;

  const parsed = residentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resolved = await resolveResidentOwner(parsed.data);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const { phones, vehicles, ...rest } = parsed.data;
  const data = { ...rest, ...resolved.fields, ...contactNestedWrites({ phones, vehicles }, false) };
  const created = await prisma.resident.create({ data, include: residentInclude });
  return NextResponse.json(created, { status: 201 });
}
