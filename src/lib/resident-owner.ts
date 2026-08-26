import { prisma } from "@/lib/prisma";

interface ResolveInput {
  unit: string;
  isOwner: boolean;
  ownerId?: string;
  // The resident being edited, so it doesn't count as "another" owner-resident
  // when re-validating its own existing isOwner:true link.
  excludeResidentId?: string;
}

type ResolveResult =
  | { fields: { ownerId: string | null; name?: string; cpf?: string | null; email?: string | null } }
  | { error: string };

// A resident always lives at a unit that already has an owner registered —
// there's nothing to pick otherwise, the apartment number already implies it.
// When the resident claims to *be* the owner (isOwner), the picked ownerId
// must be that same unit's owner — "one owner per unit" means there's only
// ever one valid choice — and name/cpf/email are derived from that Owner
// record instead of trusting whatever the client submitted (single source
// of truth, avoids the two records drifting apart). Since there's only one
// owner per unit, at most one resident may carry isOwner:true for it too.
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
