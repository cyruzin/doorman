import { prisma } from "@/lib/prisma";
import { sortUnits } from "@/lib/building";

// Occupied means somebody actually lives there — at least one active resident.
// An owner alone doesn't count: the unit can be owned and still empty, waiting
// to be rented.
export async function getOccupiedUnits(): Promise<string[]> {
  const residents = await prisma.resident.findMany({ where: { active: true }, select: { unit: true } });
  return [...new Set(residents.map((r) => r.unit))];
}

// Which of these residents' units end up with nobody living in them once they go
// inactive — the heads-up shown before confirming a deactivation.
export async function getUnitsFreedBy(residentIds: string[]): Promise<string[]> {
  if (residentIds.length === 0) return [];

  const leaving = await prisma.resident.findMany({
    where: { id: { in: residentIds }, active: true },
    select: { unit: true },
  });
  const units = [...new Set(leaving.map((r) => r.unit))];
  if (units.length === 0) return [];

  const staying = await prisma.resident.findMany({
    where: { unit: { in: units }, active: true, id: { notIn: residentIds } },
    select: { unit: true },
  });
  const stillOccupied = new Set(staying.map((r) => r.unit));
  return sortUnits(units.filter((unit) => !stillOccupied.has(unit)));
}
