import { prisma } from "@/lib/prisma";

// Occupied means somebody actually lives there — at least one active resident.
// An owner alone doesn't count: the unit can be owned and still empty, waiting
// to be rented.
export async function getOccupiedUnits(): Promise<string[]> {
  const residents = await prisma.resident.findMany({ where: { active: true }, select: { unit: true } });
  return [...new Set(residents.map((r) => r.unit))];
}
