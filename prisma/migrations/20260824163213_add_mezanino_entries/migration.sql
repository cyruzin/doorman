-- CreateTable
CREATE TABLE "MezaninoEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "residentName" TEXT NOT NULL,
    "entryAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitAt" DATETIME
);

-- CreateIndex
CREATE INDEX "MezaninoEntry_room_entryAt_idx" ON "MezaninoEntry"("room", "entryAt");

-- CreateIndex
CREATE INDEX "MezaninoEntry_room_exitAt_idx" ON "MezaninoEntry"("room", "exitAt");
