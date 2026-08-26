import { prisma } from "@/lib/prisma";
import type { SchedulingRoom } from "@/generated/prisma/enums";

// A booking normally owns its whole day; "mais de um evento no mesmo dia" overrides that.
export async function hasSchedulingConflict(
  room: SchedulingRoom,
  eventAt: Date,
  excludeId?: string,
): Promise<boolean> {
  const startOfDay = new Date(eventAt.getFullYear(), eventAt.getMonth(), eventAt.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // A cancelled booking frees up the day — it shouldn't block a new one.
  const count = await prisma.schedulingEntry.count({
    where: {
      room,
      eventAt: { gte: startOfDay, lt: endOfDay },
      cancelledAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return count > 0;
}

// Share of this month's days already booked (0% = wide open, 100% = full).
export async function getCapacityPercent(room: SchedulingRoom): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Cancelled bookings don't occupy the day.
  const monthEntries = await prisma.schedulingEntry.findMany({
    where: { room, eventAt: { gte: startOfMonth, lt: startOfNextMonth }, cancelledAt: null },
    select: { eventAt: true },
  });
  const bookedDays = new Set(monthEntries.map((e) => e.eventAt.toDateString())).size;

  return Math.round((bookedDays / totalDays) * 100);
}
