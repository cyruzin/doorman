-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Notice" ("authorUsername", "createdAt", "id", "message") SELECT "authorUsername", "createdAt", "id", "message" FROM "Notice";
DROP TABLE "Notice";
ALTER TABLE "new_Notice" RENAME TO "Notice";
CREATE INDEX "Notice_createdAt_idx" ON "Notice"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
