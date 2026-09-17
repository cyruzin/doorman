import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { unlinkUnitsSchema } from "@/lib/validations/owner";
import { requirePasswordConfirmation } from "@/lib/verify-password";

type RouteParams = { params: Promise<{ id: string }> };

// Releases apartments from an owner without touching the rest of their record — the usual
// case being a sale of one unit out of several, where deactivating would wipe all of them.
// Same permission as deactivating: it's the soft-delete family.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePermission("owners", "delete");
  if (error) return error;

  const parsed = unlinkUnitsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const owner = await prisma.owner.findUnique({
    where: { id },
    select: { active: true, units: { select: { unit: true } } },
  });
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!owner.active) return NextResponse.json({ error: "Proprietário já está inativo" }, { status: 400 });

  const owned = owner.units.map((u) => u.unit);
  const unknown = parsed.data.units.filter((unit) => !owned.includes(unit));
  if (unknown.length > 0) {
    return NextResponse.json({ error: `Apartamento(s) não pertencem a esse proprietário: ${unknown.join(", ")}` }, { status: 400 });
  }

  const unauthorized = await requirePasswordConfirmation(session.user.id, parsed.data.password);
  if (unauthorized) return unauthorized;

  const units = [...new Set(parsed.data.units)];
  const operator = session.user.name ?? null;
  // Losing every apartment leaves nothing to be an owner of — deactivate instead of keeping
  // a dangling record, and take the resident records down with it (same rule as PATCH).
  const deactivate = units.length === owned.length;

  await prisma.$transaction([
    prisma.ownerUnit.deleteMany({ where: { ownerId: id, unit: { in: units } } }),
    // A resident record only exists for the unit the owner lives in — released unit, released
    // resident. When the owner itself goes down, every linked resident goes with it.
    prisma.resident.updateMany({
      where: { ownerId: id, active: true, ...(deactivate ? {} : { unit: { in: units } }) },
      data: { active: false, deactivatedBy: operator },
    }),
    ...(deactivate
      ? [prisma.owner.update({ where: { id }, data: { active: false, deactivatedBy: operator } })]
      : []),
  ]);

  return NextResponse.json({ ok: true, deactivated: deactivate, units });
}
