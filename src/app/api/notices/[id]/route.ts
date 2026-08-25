import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePermission("notices", "delete");
  if (error) return error;

  const { id } = await params;
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (notice.isAutomatic) {
    return NextResponse.json({ error: "Não é possível excluir um recado automático" }, { status: 403 });
  }

  // Admin can clear any manual note; a doorman may only remove their own.
  if (session.user.role !== "ADMIN" && notice.authorUsername !== session.user.name) {
    return NextResponse.json({ error: "Você só pode excluir recados que você mesmo criou" }, { status: 403 });
  }

  await prisma.notice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
