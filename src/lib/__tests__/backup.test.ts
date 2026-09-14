import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { backupPath, createBackup, deleteBackup, listBackups } from "@/lib/backup";

const BACKUPS_DIR = path.join(process.cwd(), "backups");

describe("backup", () => {
  beforeEach(() => {
    fs.rmSync(BACKUPS_DIR, { recursive: true, force: true });
    process.env.BACKUP_RETENTION = "2";
  });

  afterEach(() => {
    fs.rmSync(BACKUPS_DIR, { recursive: true, force: true });
    delete process.env.BACKUP_RETENTION;
  });

  it("creates a backup file on disk", async () => {
    const backup = await createBackup();
    expect(fs.existsSync(path.join(BACKUPS_DIR, backup.fileName))).toBe(true);
    expect(listBackups()).toHaveLength(1);
  });

  it("keeps only the last N backups (retention)", async () => {
    await createBackup();
    await new Promise((r) => setTimeout(r, 10));
    await createBackup();
    await new Promise((r) => setTimeout(r, 10));
    await createBackup();

    expect(listBackups()).toHaveLength(2);
  });

  it("keeps backupPath inside the backups dir", () => {
    expect(backupPath("../../prisma/dev.db")).toBe(path.join(BACKUPS_DIR, "dev.db"));
    expect(backupPath("backup-x.db")).toBe(path.join(BACKUPS_DIR, "backup-x.db"));
  });

  it("blocks path traversal in deleteBackup", async () => {
    const backup = await createBackup();
    const outsideFile = path.join(process.cwd(), "should-not-be-deleted.txt");
    fs.writeFileSync(outsideFile, "keep me");

    deleteBackup(`../should-not-be-deleted.txt`);

    expect(fs.existsSync(outsideFile)).toBe(true);
    expect(fs.existsSync(path.join(BACKUPS_DIR, backup.fileName))).toBe(true);

    fs.rmSync(outsideFile);
  });
});
