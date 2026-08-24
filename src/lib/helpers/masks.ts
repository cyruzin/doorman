// Display-only formatting for CPF/phone inputs and table cells. The stored
// value never carries these characters — see unmask(), applied right before
// the payload leaves the form — so the DB column and its migration are
// untouched.

export function maskCpf(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Brazilian numbers: 10 digits (landline, "(11) 1234-5678") or 11 (mobile,
// "(11) 91234-5678") — the split point moves once a 9th local digit shows up.
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}
