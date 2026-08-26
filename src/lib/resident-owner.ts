import { prisma } from "@/lib/prisma";

interface ResolveInput {
  unit: string;
  isOwner: boolean;
  ownerId?: string;
  // The resident being edited — excluded so it isn't flagged as "another" owner-resident.
  excludeResidentId?: string;
}

type ResolveResult =
  | { fields: { ownerId: string | null; name?: string; cpf?: string | null; email?: string | null } }
  | { error: string };

// isOwner:true must match that unit's one registered owner; name/cpf/email come from
// the Owner record (not the client) so the two never drift apart.
export async function resolveResidentOwner(input: ResolveInput): Promise<ResolveResult> {
  const ownerUnit = await prisma.ownerUnit.findFirst({
    where: { unit: input.unit, owner: { active: true } },
    select: { owner: { select: { id: true, name: true, cpf: true, email: true } } },
  });
  if (!ownerUnit) {
    return { error: "Apartamento sem proprietário cadastrado" };
  }

  if (!input.isOwner) {
    return { fields: { ownerId: null } };
  }

  const duplicateOwnerResident = await prisma.resident.findFirst({
    where: {
      unit: input.unit,
      isOwner: true,
      active: true,
      ...(input.excludeResidentId ? { id: { not: input.excludeResidentId } } : {}),
    },
    select: { id: true },
  });
  if (duplicateOwnerResident) {
    return { error: "Já existe um morador cadastrado como proprietário para esse apartamento" };
  }

  if (input.ownerId !== ownerUnit.owner.id) {
    return { error: "Esse proprietário não está vinculado a esse apartamento" };
  }

  const { id, name, cpf, email } = ownerUnit.owner;
  return { fields: { ownerId: id, name, cpf, email } };
}
