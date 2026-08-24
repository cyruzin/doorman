import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { mezaninoEntrySchema } from "@/lib/validations/mezanino";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import type { MezaninoRoom } from "@/generated/prisma/enums";

const ROOMS = ["GAME_ROOM", "GYM", "KIDS_SPACE"] as const;

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("mezanino", "read");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") as MezaninoRoom | null;
  if (!room || !ROOMS.includes(room)) {
    return NextResponse.json({ error: "Parâmetro room inválido" }, { status: 400 });
  }

  const { page, pageSize, skip } = parsePagination(req);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const where = { room, entryAt: { gte: startOfDay, lt: endOfDay } };

  const [items, total, occupiedCount] = await Promise.all([
    prisma.mezaninoEntry.findMany({ where, orderBy: { entryAt: "desc" }, skip, take: pageSize }),
    prisma.mezaninoEntry.count({ where }),
    // Occupancy isn't bound to "today" — an entry opened right before midnight
    // still means the room is in use.
    prisma.mezaninoEntry.count({ where: { room, exitAt: null } }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    occupied: occupiedCount > 0,
  } satisfies PaginatedResult<(typeof items)[number]> & { occupied: boolean });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("mezanino", "create");
  if (error) return error;

  const parsed = mezaninoEntrySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { room, unit } = parsed.data;

  // Same priority as the unit-occupancy screen: whoever lives there now wins,
  // tenant over owner.
  const [tenant, owner] = await Promise.all([
    prisma.tenant.findFirst({ where: { unit, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.owner.findFirst({ where: { unit, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const residentName = tenant?.name ?? owner?.name;
  if (!residentName) {
    return NextResponse.json({ error: "Apartamento sem morador cadastrado" }, { status: 400 });
  }

  const entry = await prisma.mezaninoEntry.create({ data: { room, unit, residentName } });
  return NextResponse.json(entry, { status: 201 });
}
