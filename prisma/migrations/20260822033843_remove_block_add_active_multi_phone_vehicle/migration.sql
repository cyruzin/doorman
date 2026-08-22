/*
  Warnings:

  - You are about to drop the column `block` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `isWhatsapp` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleModel` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `vehiclePlate` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `block` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `isWhatsapp` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleModel` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `vehiclePlate` on the `Tenant` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Phone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "isWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "ownerId" TEXT,
    CONSTRAINT "Phone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Phone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plate" TEXT,
    "model" TEXT,
    "tenantId" TEXT,
    "ownerId" TEXT,
    CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Owner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Owner" ("cpf", "createdAt", "email", "id", "name", "unit", "updatedAt") SELECT "cpf", "createdAt", "email", "id", "name", "unit", "updatedAt" FROM "Owner";
DROP TABLE "Owner";
ALTER TABLE "new_Owner" RENAME TO "Owner";
CREATE INDEX "Owner_name_idx" ON "Owner"("name");
CREATE INDEX "Owner_unit_idx" ON "Owner"("unit");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tenant" ("cpf", "createdAt", "email", "id", "name", "ownerId", "unit", "updatedAt") SELECT "cpf", "createdAt", "email", "id", "name", "ownerId", "unit", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE INDEX "Tenant_name_idx" ON "Tenant"("name");
CREATE INDEX "Tenant_unit_idx" ON "Tenant"("unit");
CREATE INDEX "Tenant_ownerId_idx" ON "Tenant"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Phone_tenantId_idx" ON "Phone"("tenantId");

-- CreateIndex
CREATE INDEX "Phone_ownerId_idx" ON "Phone"("ownerId");

-- CreateIndex
CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");

-- CreateIndex
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");
