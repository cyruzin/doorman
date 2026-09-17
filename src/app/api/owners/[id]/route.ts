import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sortUnits } from "@/lib/building";
import { requirePermission } from "@/lib/api-guard";
import { can } from "@/lib/permissions-db";
import { ownerUpdateSchema } from "@/lib/validations/owner";
import { contactNestedWrites } from "@/lib/contact-writes";
import { findClaimedUnits, getAllClaimedUnits } from "@/lib/owner-units";
import { normalizeCpf } from "@/lib/normalize-cpf";
import { requirePasswordConfirmation } from "@/lib/verify-password";

const ownerInclude = {
  phones: true,
  vehicles: true,
  units: { select: { unit: true } },
  residents: { select: { id: true, name: true, unit: true, active: true } },
} as const;

function toOwnerResponse(owner: { units: { unit: string }[] } & Record<string, unknown>) {
  return { ...owner, units: sortUnits(owner.units.map((u) => u.unit)) };
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
  const current = await prisma.owner.findUnique({
    where: { id },
    select: { active: true, units: { select: { unit: true } } },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const currentUnits = current.units.map((u) => u.unit);

  // Activating/deactivating is the soft-delete equivalent — same permission as delete.
  if (parsed.data.active !== undefined && current.active !== parsed.data.active && !(await can(session.user.role, "owners", "delete"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.units !== undefined) {
    const claimed = await findClaimedUnits(parsed.data.units, id);
    if (claimed.length > 0) {
      return NextResponse.json({ error: `Apartamento(s) já possuem proprietário: ${claimed.join(", ")}` }, { status: 400 });
    }

    // Dropping a unit here would be the same destructive change as unlinking, minus the
    // password and the warning — so it goes through /unlink instead. An inactive owner has
    // nothing live to protect, and needs the escape hatch to resolve a conflict before
    // being reactivated.
    const dropped = current.active ? currentUnits.filter((unit) => !parsed.data.units!.includes(unit)) : [];
    if (dropped.length > 0) {
      return NextResponse.json(
        { error: `Use "Desvincular" para remover apartamento(s) do proprietário: ${dropped.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // The units stay on the record while it's inactive, so reactivating restores all of them —
  // but somebody may have taken one over in the meantime, and two active owners for the same
  // apartment would break every "the owner of this unit" lookup.
  if (parsed.data.active === true && !current.active) {
    const claims = await getAllClaimedUnits(id);
    const taken = (parsed.data.units ?? currentUnits).filter((unit) => claims[unit]);
    if (taken.length > 0) {
      return NextResponse.json(
        {
          error: `Não é possível reativar: ${taken
            .map((unit) => `${unit} agora pertence a ${claims[unit]}`)
            .join(", ")}. Edite os apartamentos deste cadastro antes de reativar.`,
        },
        { status: 400 },
      );
    }
  }

  // Deactivating an owner takes their resident record down with it: the two rows are the
  // same person, so leaving it active keeps them listed as living in the unit (apartamentos,
  // mezanino, agendamentos) after they sold. Reactivating is not symmetric — the resident may
  // have been deactivated on its own, and only the user knows if they moved back in.
  const deactivating = parsed.data.active === false && current.active;
  const { units, phones, vehicles, password, ...rest } = parsed.data;

  if (deactivating) {
    const unauthorized = await requirePasswordConfirmation(session.user.id, password);
    if (unauthorized) return unauthorized;
  }

  const operator = session.user.name ?? null;
  try {
    const updated = await prisma.owner.update({
      where: { id },
      data: {
        ...normalizeCpf(rest),
        ...(units !== undefined ? { units: { deleteMany: {}, create: units.map((unit) => ({ unit })) } } : {}),
        ...(deactivating
          ? {
              deactivatedBy: operator,
              residents: { updateMany: { where: { active: true }, data: { active: false, deactivatedBy: operator } } },
            }
          : {}),
        ...(parsed.data.active === true ? { deactivatedBy: null } : {}),
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

  // Block the delete instead of orphaning a resident record linked to this owner.
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
