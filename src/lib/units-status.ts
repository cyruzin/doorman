import { prisma } from "@/lib/prisma";

// A unit counts as occupied once it has an active owner or at least one active resident.
export async function getOccupiedUnits(): Promise<string[]> {
  const [ownerUnits, residents] = await Promise.all([
    prisma.ownerUnit.findMany({ where: { owner: { active: true } }, select: { unit: true } }),
    prisma.resident.findMany({ where: { active: true }, select: { unit: true } }),
  ]);
  return [...new Set([...ownerUnits.map((u) => u.unit), ...residents.map((r) => r.unit)])];
}
