import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { can } from "@/lib/permissions-db";
import { getAllUnits } from "@/lib/building";
import { getCapacityPercent } from "@/lib/scheduling";
import { SCHEDULING_ROOMS } from "@/modules/scheduling/types";
import type { SchedulingRoom } from "@/generated/prisma/enums";

async function loadOccupancy() {
  const [ownerUnits, residents] = await Promise.all([
    prisma.ownerUnit.findMany({ where: { owner: { active: true } }, select: { unit: true } }),
    prisma.resident.findMany({ where: { active: true }, select: { unit: true } }),
  ]);
  const occupiedUnits = new Set([...ownerUnits, ...residents].map((r) => r.unit)).size;

  return {
    totalUnits: getAllUnits().length,
    occupiedUnits,
    // Ownership alone doesn't make someone a "morador" — only actual
    // residents count, matching the new owner/resident split.
    totalResidents: residents.length,
  };
}

async function loadScheduling() {
  const [capacityEntries, upcoming] = await Promise.all([
    Promise.all(SCHEDULING_ROOMS.map(async (room) => [room, await getCapacityPercent(room)] as const)),
    prisma.schedulingEntry.findMany({
      where: { finishedAt: null, cancelledAt: null, eventAt: { gte: new Date() } },
      orderBy: { eventAt: "asc" },
      take: 5,
    }),
  ]);

  return {
    capacityByRoom: Object.fromEntries(capacityEntries) as Record<SchedulingRoom, number>,
    upcoming,
  };
}

function loadPinnedNotices() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  return prisma.notice.findMany({
    where: { showOnHome: true, createdAt: { gte: startOfDay, lt: startOfNextDay } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export async function GET() {
  // Every role that can reach the dashboard already has at least resident
  // read access — used as the baseline auth gate for the whole summary.
  const { session, error } = await requirePermission("residents", "read");
  if (error) return error;

  const [canScheduling, canNotices] = await Promise.all([
    can(session.user.role, "scheduling", "read"),
    can(session.user.role, "notices", "read"),
  ]);
  const [occupancy, scheduling, notices] = await Promise.all([
    loadOccupancy(),
    canScheduling ? loadScheduling() : Promise.resolve(null),
    canNotices ? loadPinnedNotices() : Promise.resolve(null),
  ]);

  return NextResponse.json({ occupancy, scheduling, notices });
}
