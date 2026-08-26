import { prisma } from "@/lib/prisma";

// One *active* owner per unit is the rule — check before writing so a
// conflict comes back as a clean 400 with the offending unit(s). Scoped to
// active owners: a deactivated owner's old units must stay claimable by
// whoever takes over. excludeOwnerId lets an owner keep units they already
// hold when editing.
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
