import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Re-authentication gate for destructive changes (deactivating a record, unlinking an
// apartment): the porteiro's station is often left logged in, so the password is what
// ties the action to a person. Returns the 401 response to hand back, or null when it checks out.
export async function requirePasswordConfirmation(userId: string, password: string | undefined) {
  if (!password) {
    return NextResponse.json({ error: "Confirme sua senha para continuar" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  return null;
}
