/*
  Warnings:

  - You are about to drop the `Tenant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `unit` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Phone` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `Vehicle` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Tenant_ownerId_idx";

-- DropIndex
DROP INDEX "Tenant_unit_idx";

-- DropIndex
DROP INDEX "Tenant_name_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Tenant";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resident_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OwnerUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnerUnit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Owner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Owner" ("active", "cpf", "createdAt", "email", "id", "name", "updatedAt") SELECT "active", "cpf", "createdAt", "email", "id", "name", "updatedAt" FROM "Owner";
DROP TABLE "Owner";
ALTER TABLE "new_Owner" RENAME TO "Owner";
CREATE UNIQUE INDEX "Owner_cpf_key" ON "Owner"("cpf");
CREATE INDEX "Owner_name_idx" ON "Owner"("name");
CREATE TABLE "new_Phone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "isWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "residentId" TEXT,
    "ownerId" TEXT,
    CONSTRAINT "Phone_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Phone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Phone" ("id", "isWhatsapp", "number", "ownerId") SELECT "id", "isWhatsapp", "number", "ownerId" FROM "Phone";
DROP TABLE "Phone";
ALTER TABLE "new_Phone" RENAME TO "Phone";
CREATE INDEX "Phone_residentId_idx" ON "Phone"("residentId");
CREATE INDEX "Phone_ownerId_idx" ON "Phone"("ownerId");
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plate" TEXT,
    "model" TEXT,
    "residentId" TEXT,
    "ownerId" TEXT,
    CONSTRAINT "Vehicle_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("id", "model", "ownerId", "plate") SELECT "id", "model", "ownerId", "plate" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_residentId_idx" ON "Vehicle"("residentId");
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Resident_name_idx" ON "Resident"("name");

-- CreateIndex
CREATE INDEX "Resident_unit_idx" ON "Resident"("unit");

-- CreateIndex
CREATE INDEX "Resident_ownerId_idx" ON "Resident"("ownerId");

-- CreateIndex
CREATE INDEX "OwnerUnit_unit_idx" ON "OwnerUnit"("unit");

-- CreateIndex
CREATE INDEX "OwnerUnit_ownerId_idx" ON "OwnerUnit"("ownerId");
