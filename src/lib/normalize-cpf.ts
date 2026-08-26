// "" -> null so it doesn't collide with the unique cpf constraint (unlike NULL).
export function normalizeCpf<T extends { cpf?: string | null }>(data: T): T {
  if (!("cpf" in data)) return data;
  return { ...data, cpf: data.cpf ? data.cpf : null };
}
