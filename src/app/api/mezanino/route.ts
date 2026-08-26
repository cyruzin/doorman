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
    // Occupancy isn't bound to "today" — an entry from before midnight still counts.
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

  const { room, unit, residentId } = parsed.data;

  // Re-verify residentId is still a real, active resident of this unit — don't trust the client.
  const resident = await prisma.resident.findFirst({ where: { id: residentId, unit, active: true }, select: { name: true } });
  if (!resident) {
    return NextResponse.json({ error: "Morador inválido para esse apartamento" }, { status: 400 });
  }
  const residentName = resident.name;

  const entry = await prisma.mezaninoEntry.create({ data: { room, unit, residentName } });
  return NextResponse.json(entry, { status: 201 });
}
