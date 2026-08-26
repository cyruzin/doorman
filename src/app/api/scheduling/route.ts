import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { schedulingEntrySchema } from "@/lib/validations/scheduling";
import { getCapacityPercent, hasSchedulingConflict } from "@/lib/scheduling";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import type { SchedulingRoom } from "@/generated/prisma/enums";

const ROOMS = ["PARTY_HALL", "CINEMA", "GRILL"] as const;

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("scheduling", "read");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") as SchedulingRoom | null;
  if (!room || !ROOMS.includes(room)) {
    return NextResponse.json({ error: "Parâmetro room inválido" }, { status: 400 });
  }

  const { page, pageSize, skip } = parsePagination(req);
  // Cancelled events fall off the listing — they never happened. Finished
  // ones stay, so the capacity percentage (which counts them) is explained
  // by what's visibly in the list instead of silently disappearing.
  const where = { room, cancelledAt: null };

  const [items, total, capacityPercent] = await Promise.all([
    // Pending entries (finishedAt: null) first — they're what needs
    // attention — then finished ones, each group newest-event-first.
    prisma.schedulingEntry.findMany({
      where,
      orderBy: [{ finishedAt: { sort: "asc", nulls: "first" } }, { eventAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.schedulingEntry.count({ where }),
    getCapacityPercent(room),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    capacityPercent,
  } satisfies PaginatedResult<(typeof items)[number]> & { capacityPercent: number });
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("scheduling", "create");
  if (error) return error;

  const parsed = schedulingEntrySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { room, unit, residentId, eventAt, allowMultipleSameDay, notes } = parsed.data;

  // The resident is picked client-side from the unit's current occupants —
  // re-verify it's still a real, active resident of this unit rather than
  // trusting the submitted id blindly.
  const resident = await prisma.resident.findFirst({ where: { id: residentId, unit, active: true }, select: { name: true } });
  if (!resident) {
    return NextResponse.json({ error: "Morador inválido para esse apartamento" }, { status: 400 });
  }
  const requesterName = resident.name;

  if (!allowMultipleSameDay && (await hasSchedulingConflict(room, eventAt))) {
    return NextResponse.json(
      { error: "Já existe um evento agendado nesse dia. Marque 'Mais de um evento no mesmo dia' para continuar." },
      { status: 400 },
    );
  }

  const entry = await prisma.schedulingEntry.create({
    data: { room, unit, requesterName, eventAt, allowMultipleSameDay, notes: notes ?? null },
  });
  return NextResponse.json(entry, { status: 201 });
}
