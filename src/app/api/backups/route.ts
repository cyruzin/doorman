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
    // Sem horário, "até" vira meia-noite e exclui backups do próprio dia.
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
