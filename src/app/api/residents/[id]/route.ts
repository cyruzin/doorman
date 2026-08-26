import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { can } from "@/lib/permissions";
import { residentUpdateSchema } from "@/lib/validations/resident";
import { contactNestedWrites } from "@/lib/contact-writes";
import { resolveResidentOwner } from "@/lib/resident-owner";

const residentInclude = { phones: true, vehicles: true, owner: { select: { id: true, name: true } } } as const;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("residents", "read");
  if (error) return error;

  const { id } = await params;
  const resident = await prisma.resident.findUnique({ where: { id }, include: residentInclude });
  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resident);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error, session } = await requirePermission("residents", "update");
  if (error) return error;

  const parsed = residentUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const current = await prisma.resident.findUnique({ where: { id }, select: { active: true, unit: true, isOwner: true } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Activating/deactivating is the soft-delete equivalent — same permission as delete.
  // The edit form always resubmits the resident's current `active` value even when
  // untouched, so only gate on an actual transition, not mere presence in the payload.
  if (parsed.data.active !== undefined && current.active !== parsed.data.active && !can(session.user.role, "residents", "delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phones, vehicles, ...rest } = parsed.data;
  let ownerFields: Record<string, unknown> = {};

  // Only re-resolve the owner link when something that affects it actually
  // changed — a plain phones/vehicles edit shouldn't pay for it.
  if (parsed.data.unit !== undefined || parsed.data.isOwner !== undefined || parsed.data.ownerId !== undefined) {
    const resolved = await resolveResidentOwner({
      unit: parsed.data.unit ?? current.unit,
      isOwner: parsed.data.isOwner ?? current.isOwner,
      ownerId: parsed.data.ownerId,
      excludeResidentId: id,
    });
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    ownerFields = resolved.fields;
  }

  const updated = await prisma.resident.update({
    where: { id },
    data: { ...rest, ...ownerFields, ...contactNestedWrites({ phones, vehicles }, true) },
    include: residentInclude,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("residents", "delete");
  if (error) return error;

  const { id } = await params;
  await prisma.resident.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
