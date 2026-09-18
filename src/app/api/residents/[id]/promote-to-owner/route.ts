import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { can } from "@/lib/permissions-db";
import { promoteResidentToOwnerSchema } from "@/lib/validations/resident";
import { findClaimedUnits } from "@/lib/owner-units";
import { normalizeCpf } from "@/lib/normalize-cpf";

type RouteParams = { params: Promise<{ id: string }> };

// Creates the Owner record and links this resident to it in one step, for a resident who
// already lives in a unit with no registered owner and is becoming that owner themselves —
// skips retyping name/cpf/email into a separate "novo proprietário" form.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePermission("owners", "create");
  if (error) return error;
  if (!(await can(session.user.role, "residents", "update"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = promoteResidentToOwnerSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const resident = await prisma.resident.findUnique({
    where: { id },
    select: { unit: true, active: true, isOwner: true },
  });
  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!resident.active) return NextResponse.json({ error: "Morador está inativo" }, { status: 400 });
  if (resident.isOwner) return NextResponse.json({ error: "Esse morador já é proprietário" }, { status: 400 });

  const claimed = await findClaimedUnits([resident.unit]);
  if (claimed.length > 0) {
    return NextResponse.json({ error: `Apartamento ${resident.unit} já possui proprietário` }, { status: 400 });
  }

  try {
    const owner = await prisma.$transaction(async (tx) => {
      const created = await tx.owner.create({
        data: { ...normalizeCpf(parsed.data), units: { create: [{ unit: resident.unit }] } },
      });
      await tx.resident.update({
        where: { id },
        data: { isOwner: true, ownerId: created.id, name: created.name, cpf: created.cpf, email: created.email },
      });
      return created;
    });
    return NextResponse.json(owner, { status: 201 });
  } catch (err) {
    if (isUniqueCpfViolation(err)) {
      return NextResponse.json({ error: "Já existe um proprietário cadastrado com esse CPF" }, { status: 400 });
    }
    throw err;
  }
}

function isUniqueCpfViolation(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
}
