import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("mezanino", "update");
  if (error) return error;

  const { id } = await params;
  const entry = await prisma.mezaninoEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.exitAt) return NextResponse.json({ error: "Saída já registrada" }, { status: 400 });

  const updated = await prisma.mezaninoEntry.update({ where: { id }, data: { exitAt: new Date() } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePermission("mezanino", "delete");
  if (error) return error;

  const { id } = await params;
  const entry = await prisma.mezaninoEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A doorman may only undo an entry with no exit yet; admin can rewrite history.
  if (entry.exitAt && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Somente o administrador pode excluir uma saída já confirmada" },
      { status: 403 },
    );
  }

  await prisma.mezaninoEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
