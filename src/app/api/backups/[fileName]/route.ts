import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { deleteBackup } from "@/lib/backup";

type RouteParams = { params: Promise<{ fileName: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("backups", "delete");
  if (error) return error;

  const { fileName } = await params;
  deleteBackup(decodeURIComponent(fileName));
  return NextResponse.json({ ok: true });
}
