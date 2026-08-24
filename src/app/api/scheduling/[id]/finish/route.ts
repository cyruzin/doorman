import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePermission("scheduling", "update");
  if (error) return error;

  const { id } = await params;
  const entry = await prisma.schedulingEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.finishedAt) return NextResponse.json({ error: "Evento já finalizado" }, { status: 400 });
  if (entry.cancelledAt) return NextResponse.json({ error: "Não é possível finalizar um evento cancelado" }, { status: 400 });

  const updated = await prisma.schedulingEntry.update({
    where: { id },
    data: { finishedAt: new Date(), finishedByUsername: session.user.name },
  });
  return NextResponse.json(updated);
}
