import bcrypt from "bcrypt";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const dbPath = (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, "");
const db = new Database(dbPath);

async function main() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "admin123";
  const name = process.argv[4] || "Administrador";
  const passwordHash = await bcrypt.hash(password, 10);

  // This script only creates the bootstrap/recovery account, so it's always the super admin.
  db.prepare(
    `INSERT INTO User (id, name, username, passwordHash, role, isSuperAdmin, createdAt)
     VALUES (@id, @name, @username, @passwordHash, 'ADMIN', 1, @createdAt)
     ON CONFLICT(username) DO UPDATE SET passwordHash = excluded.passwordHash, role = 'ADMIN', isSuperAdmin = 1`,
  ).run({
    id: randomUUID(),
    name,
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  console.log(`Super admin user ready: ${username} (password: ${password})`);
}

main().finally(() => db.close());
