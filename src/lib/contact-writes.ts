// On update, deleteMany + create fully replaces the set — simpler than diffing rows.
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
