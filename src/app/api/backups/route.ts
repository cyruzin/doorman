import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { createBackup, listBackups } from "@/lib/backup";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("backups", "read");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const backups = listBackups(
    from ? new Date(from) : undefined,
    // A data "até" sem horário vira meia-noite — sem isso, backups criados
    // mais tarde no próprio dia ficariam fora do filtro.
    to ? new Date(`${to}T23:59:59.999`) : undefined,
  );
  return NextResponse.json(backups);
}

export async function POST() {
  const { error } = await requirePermission("backups", "create");
  if (error) return error;

  const backup = await createBackup();
  return NextResponse.json(backup, { status: 201 });
}
