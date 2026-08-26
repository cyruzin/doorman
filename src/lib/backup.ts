import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const BACKUPS_DIR = path.join(process.cwd(), "backups");

function getDbPath(): string {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  return path.resolve(process.cwd(), url.replace(/^file:/, ""));
}

function getRetention(): number {
  const n = Number(process.env.BACKUP_RETENTION);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

export interface BackupFile {
  fileName: string;
  createdAt: Date;
  sizeBytes: number;
}

export async function createBackup(): Promise<BackupFile> {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  const destPath = path.join(BACKUPS_DIR, fileName);

  const db = new Database(getDbPath(), { readonly: true });
  try {
    await db.backup(destPath);
  } finally {
    db.close();
  }

  enforceRetention();

  const stats = fs.statSync(destPath);
  return { fileName, createdAt: stats.birthtime, sizeBytes: stats.size };
}

export function listBackups(from?: Date, to?: Date): BackupFile[] {
  if (!fs.existsSync(BACKUPS_DIR)) return [];

  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((fileName) => fileName.endsWith(".db"))
    .map((fileName) => {
      const stats = fs.statSync(path.join(BACKUPS_DIR, fileName));
      return { fileName, createdAt: stats.birthtime, sizeBytes: stats.size };
    })
    .filter((b) => (!from || b.createdAt >= from) && (!to || b.createdAt <= to))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function deleteBackup(fileName: string): void {
  // basename() blocks path traversal from a user-supplied file name
  const filePath = path.join(BACKUPS_DIR, path.basename(fileName));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function enforceRetention(): void {
  const excess = listBackups().slice(getRetention());
  for (const b of excess) {
    fs.unlinkSync(path.join(BACKUPS_DIR, b.fileName));
  }
}
