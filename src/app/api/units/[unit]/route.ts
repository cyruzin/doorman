import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";

type RouteParams = { params: Promise<{ unit: string }> };

// Occupancy is always about who lives there *now* — only active owners/tenants.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("tenants", "read");
  if (error) return error;

  const { unit } = await params;

  const [owners, tenants] = await Promise.all([
    prisma.owner.findMany({
      where: { unit, active: true },
      select: { id: true, name: true, phones: { select: { id: true, number: true, isWhatsapp: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findMany({
      where: { unit, active: true },
      select: { id: true, name: true, phones: { select: { id: true, number: true, isWhatsapp: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ owners, tenants });
}
