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
  // Finished and cancelled events fall off the listing — the doorman only
  // needs to see what's still upcoming or awaiting action. They still show
  // up in /reports, which reports on closed bookings.
  const where = { room, finishedAt: null, cancelledAt: null };

  const [items, total, capacityPercent] = await Promise.all([
    prisma.schedulingEntry.findMany({ where, orderBy: { eventAt: "desc" }, skip, take: pageSize }),
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

  const { room, unit, eventAt, allowMultipleSameDay, notes } = parsed.data;

  const [tenant, owner] = await Promise.all([
    prisma.tenant.findFirst({ where: { unit, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.owner.findFirst({ where: { unit, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
  ]);
  const requesterName = tenant?.name ?? owner?.name;
  if (!requesterName) {
    return NextResponse.json({ error: "Apartamento sem morador cadastrado" }, { status: 400 });
  }

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
