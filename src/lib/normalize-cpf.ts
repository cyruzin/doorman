// An empty string means "no cpf" — normalize it to null so it doesn't
// collide with the Owner.cpf unique constraint, which (unlike NULL) treats
// "" as a real, shared value that a second cpf-less owner couldn't reuse.
// Only touches the key when it's actually present, so a partial update that
// doesn't mention cpf leaves it untouched.
export function normalizeCpf<T extends { cpf?: string | null }>(data: T): T {
  if (!("cpf" in data)) return data;
  return { ...data, cpf: data.cpf ? data.cpf : null };
}
