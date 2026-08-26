import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";

type RouteParams = { params: Promise<{ unit: string }> };

// Occupancy is always about who's tied to the unit *now* — only the active
// owner (there's at most one) and active residents actually living there.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("residents", "read");
  if (error) return error;

  const { unit } = await params;
  const phoneSelect = { select: { id: true, number: true, isWhatsapp: true } } as const;

  const [ownerUnit, residents] = await Promise.all([
    prisma.ownerUnit.findFirst({
      where: { unit, owner: { active: true } },
      select: { owner: { select: { id: true, name: true, phones: phoneSelect } } },
    }),
    prisma.resident.findMany({
      where: { unit, active: true },
      select: { id: true, name: true, isOwner: true, phones: phoneSelect },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ owner: ownerUnit?.owner ?? null, residents });
}
