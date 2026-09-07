import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mostRecentShiftBoundary } from "@/lib/shift";

function formatShiftHour(date: Date): string {
  return `${date.getHours()}h`;
}

// Registro automático no mural pra troca de turno — não passa por
// requirePermission("notices", "create") porque é um evento do sistema, não
// uma ação escolhida pelo porteiro, e precisa acontecer mesmo pra quem não
// tem essa permissão.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notice = await prisma.notice.create({
    data: {
      message: `Logout automático realizado — ${formatShiftHour(mostRecentShiftBoundary())}. Sessão encerrada automaticamente conforme rotina de segurança do sistema.`,
      showOnHome: true,
      isAutomatic: true,
      authorUsername: session.user.name ?? "—",
    },
  });
  return NextResponse.json(notice, { status: 201 });
}
