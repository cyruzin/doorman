import { prisma } from "@/lib/prisma";

// One active owner per unit — scoped to active owners so a deactivated owner's units stay claimable.
export async function findClaimedUnits(units: string[], excludeOwnerId?: string): Promise<string[]> {
  if (units.length === 0) return [];
  const claimed = await prisma.ownerUnit.findMany({
    where: {
      unit: { in: units },
      owner: { active: true, ...(excludeOwnerId ? { id: { not: excludeOwnerId } } : {}) },
    },
    select: { unit: true },
  });
  return claimed.map((c) => c.unit);
}

// Every unit already owned by another active owner, with who owns it — lets the picker
// grey those out up front and explain why in a tooltip.
export async function getAllClaimedUnits(excludeOwnerId?: string): Promise<Record<string, string>> {
  const claimed = await prisma.ownerUnit.findMany({
    where: { owner: { active: true, ...(excludeOwnerId ? { id: { not: excludeOwnerId } } : {}) } },
    select: { unit: true, owner: { select: { name: true } } },
  });
  return Object.fromEntries(claimed.map((c) => [c.unit, c.owner.name]));
}
