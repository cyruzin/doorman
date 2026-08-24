-- CreateTable
CREATE TABLE "SchedulingEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "eventAt" DATETIME NOT NULL,
    "allowMultipleSameDay" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SchedulingEntry_room_eventAt_idx" ON "SchedulingEntry"("room", "eventAt");
