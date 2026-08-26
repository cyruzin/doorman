// phones/vehicles arrive as plain arrays from the form; Prisma needs them as
// nested writes. On update, `deleteMany: {}` + `create` fully replaces the set —
// simpler than diffing add/edit/remove for what's a handful of rows per person.
// Shared by Owner and Resident writes — both have the same phones/vehicles shape.
export function contactNestedWrites(
  data: { phones?: unknown; vehicles?: unknown },
  isUpdate: boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.phones !== undefined) {
    result.phones = isUpdate ? { deleteMany: {}, create: data.phones } : { create: data.phones };
  }
  if (data.vehicles !== undefined) {
    result.vehicles = isUpdate ? { deleteMany: {}, create: data.vehicles } : { create: data.vehicles };
  }
  return result;
}
