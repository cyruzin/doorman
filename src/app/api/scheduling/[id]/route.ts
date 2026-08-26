import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { schedulingUpdateSchema } from "@/lib/validations/scheduling";
import { hasSchedulingConflict } from "@/lib/scheduling";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("scheduling", "update");
  if (error) return error;

  const { id } = await params;
  const entry = await prisma.schedulingEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.finishedAt) return NextResponse.json({ error: "Não é possível editar um evento já finalizado" }, { status: 400 });
  if (entry.cancelledAt) return NextResponse.json({ error: "Não é possível editar um evento cancelado" }, { status: 400 });

  const parsed = schedulingUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { eventAt, allowMultipleSameDay, notes } = parsed.data;

  if (!allowMultipleSameDay && (await hasSchedulingConflict(entry.room, eventAt, id))) {
    return NextResponse.json(
      { error: "Já existe um evento agendado nesse dia. Marque 'Mais de um evento no mesmo dia' para continuar." },
      { status: 400 },
    );
  }

  const updated = await prisma.schedulingEntry.update({
    where: { id },
    data: { eventAt, allowMultipleSameDay, notes: notes ?? null },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requirePermission("scheduling", "delete");
  if (error) return error;

  const { id } = await params;
  const entry = await prisma.schedulingEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.cancelledAt) return NextResponse.json({ error: "Agendamento já cancelado" }, { status: 400 });

  // A doorman may only undo a not-yet-finished entry; admin can rewrite history.
  if (entry.finishedAt && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Somente o administrador pode excluir um evento já finalizado" },
      { status: 403 },
    );
  }

  // Soft cancel — cancelled bookings still need to show up in the report.
  await prisma.schedulingEntry.update({
    where: { id },
    data: { cancelledAt: new Date(), cancelledByUsername: session.user.name },
  });
  return NextResponse.json({ ok: true });
}
