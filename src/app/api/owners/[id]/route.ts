import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { can } from "@/lib/permissions-db";
import { ownerUpdateSchema } from "@/lib/validations/owner";
import { contactNestedWrites } from "@/lib/contact-writes";
import { findClaimedUnits } from "@/lib/owner-units";
import { normalizeCpf } from "@/lib/normalize-cpf";

const ownerInclude = {
  phones: true,
  vehicles: true,
  units: { select: { unit: true } },
  residents: { select: { id: true, name: true, unit: true } },
} as const;

function toOwnerResponse(owner: { units: { unit: string }[] } & Record<string, unknown>) {
  return { ...owner, units: owner.units.map((u) => u.unit) };
}

function isUniqueCpfViolation(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("owners", "read");
  if (error) return error;

  const { id } = await params;
  const owner = await prisma.owner.findUnique({ where: { id }, include: ownerInclude });
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toOwnerResponse(owner));
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error, session } = await requirePermission("owners", "update");
  if (error) return error;

  const parsed = ownerUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const current = await prisma.owner.findUnique({ where: { id }, select: { active: true } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Activating/deactivating is the soft-delete equivalent — same permission as delete.
  if (parsed.data.active !== undefined && current.active !== parsed.data.active && !(await can(session.user.role, "owners", "delete"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.units !== undefined) {
    const claimed = await findClaimedUnits(parsed.data.units, id);
    if (claimed.length > 0) {
      return NextResponse.json({ error: `Apartamento(s) já possuem proprietário: ${claimed.join(", ")}` }, { status: 400 });
    }
  }

  const { units, phones, vehicles, ...rest } = parsed.data;
  try {
    const updated = await prisma.owner.update({
      where: { id },
      data: {
        ...normalizeCpf(rest),
        ...(units !== undefined ? { units: { deleteMany: {}, create: units.map((unit) => ({ unit })) } } : {}),
        ...contactNestedWrites({ phones, vehicles }, true),
      },
      include: ownerInclude,
    });
    return NextResponse.json(toOwnerResponse(updated));
  } catch (err) {
    if (isUniqueCpfViolation(err)) {
      return NextResponse.json({ error: "Já existe um proprietário cadastrado com esse CPF" }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("owners", "delete");
  if (error) return error;

  const { id } = await params;

  // A resident record that IS this owner would be left dangling (isOwner:
  // true, ownerId pointing nowhere) — block the delete instead of silently
  // orphaning it.
  const linkedResident = await prisma.resident.findFirst({ where: { ownerId: id }, select: { id: true } });
  if (linkedResident) {
    return NextResponse.json(
      { error: "Não é possível excluir: há um morador vinculado a este proprietário" },
      { status: 400 },
    );
  }

  await prisma.owner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
