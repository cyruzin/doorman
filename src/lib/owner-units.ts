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
