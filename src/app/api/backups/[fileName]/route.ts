import fs from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-guard";
import { backupPath, deleteBackup } from "@/lib/backup";

type RouteParams = { params: Promise<{ fileName: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("backups", "read");
  if (error) return error;

  const { fileName } = await params;
  const safeName = decodeURIComponent(fileName);
  const filePath = backupPath(safeName);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });

  // Streamed so a large .db never sits in the Pi's memory.
  const body = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(fs.statSync(filePath).size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("backups", "delete");
  if (error) return error;

  const { fileName } = await params;
  deleteBackup(decodeURIComponent(fileName));
  return NextResponse.json({ ok: true });
}
