// The owner select's empty option submits "" — that means "unlink", so it must
// become `null` for Prisma. An omitted key (partial update) is left untouched.
// Owner records have no `ownerId` column at all, so they're never touched.
export function normalizeOwnerId(
  model: "tenant" | "owner",
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (model !== "tenant" || !("ownerId" in data)) return data;
  return { ...data, ownerId: data.ownerId || null };
}
