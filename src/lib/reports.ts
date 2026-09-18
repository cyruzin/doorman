import type { Prisma } from "@/generated/prisma/client";
import type { MezaninoRoom, SchedulingRoom } from "@/generated/prisma/enums";

// Paper trail of used vs. cancelled bookings, for billing/reconciliation —
// plus the mezanino spaces' entry/exit log, rendered through the same report UI.
export const SCHEDULING_REPORT_ROOMS = ["PARTY_HALL", "CINEMA", "GRILL"] as const;
export const MEZANINO_REPORT_ROOMS = ["GAME_ROOM", "GYM", "KIDS_SPACE"] as const;
export const REPORT_ROOMS = [...SCHEDULING_REPORT_ROOMS, ...MEZANINO_REPORT_ROOMS] as const;
export type ReportRoom = (typeof REPORT_ROOMS)[number];

export const REPORT_ROOM_LABELS: Record<ReportRoom, string> = {
  PARTY_HALL: "Salão de festas",
  CINEMA: "Cinema",
  GRILL: "Grill",
  GAME_ROOM: "Salão de jogos",
  GYM: "Academia",
  KIDS_SPACE: "Espaço kids",
};

export function isMezaninoReportRoom(room: ReportRoom): room is (typeof MEZANINO_REPORT_ROOMS)[number] {
  return (MEZANINO_REPORT_ROOMS as readonly string[]).includes(room);
}

// Independent checkboxes — none, one, several, or all three can be checked.
export interface ReportStatusFilter {
  all: boolean;
  finished: boolean;
  cancelled: boolean;
}

export function parseStatusFilter(searchParams: URLSearchParams): ReportStatusFilter {
  return {
    all: searchParams.get("all") === "true",
    finished: searchParams.get("finished") === "true",
    cancelled: searchParams.get("cancelled") === "true",
  };
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export function parseDateRange(searchParams: URLSearchParams): DateRangeFilter | { error: string } {
  const startRaw = searchParams.get("startDate");
  const endRaw = searchParams.get("endDate");
  const startDate = startRaw ? new Date(`${startRaw}T00:00:00`) : undefined;
  const endDate = endRaw ? new Date(`${endRaw}T23:59:59.999`) : undefined;

  if (startRaw && isNaN(startDate!.getTime())) return { error: "Data inicial inválida" };
  if (endRaw && isNaN(endDate!.getTime())) return { error: "Data final inválida" };
  if (startRaw && endRaw && startRaw > endRaw) {
    return { error: "A data inicial não pode ser depois da data final" };
  }

  return { startDate, endDate };
}

export function buildReportWhere({
  room,
  statusFilter,
  range,
  q,
}: {
  room: SchedulingRoom;
  statusFilter: ReportStatusFilter;
  range: DateRangeFilter;
  q?: string;
}): Prisma.SchedulingEntryWhereInput {
  const includeFinished = statusFilter.all || statusFilter.finished;
  const includeCancelled = statusFilter.all || statusFilter.cancelled;

  // Nothing checked means nothing matches, not "no filter applied".
  const statusCondition: Prisma.SchedulingEntryWhereInput =
    includeFinished && includeCancelled
      ? { OR: [{ finishedAt: { not: null } }, { cancelledAt: { not: null } }] }
      : includeFinished
        ? { finishedAt: { not: null } }
        : includeCancelled
          ? { cancelledAt: { not: null } }
          : { id: "" };

  return {
    room,
    ...statusCondition,
    ...(range.startDate || range.endDate
      ? {
          eventAt: {
            ...(range.startDate ? { gte: range.startDate } : {}),
            ...(range.endDate ? { lte: range.endDate } : {}),
          },
        }
      : {}),
    ...(q ? { unit: { contains: q } } : {}),
  };
}

export function buildMezaninoReportWhere({
  room,
  statusFilter,
  range,
  q,
}: {
  room: MezaninoRoom;
  statusFilter: ReportStatusFilter;
  range: DateRangeFilter;
  q?: string;
}): Prisma.MezaninoEntryWhereInput {
  const includeReturned = statusFilter.all || statusFilter.finished;
  const includePending = statusFilter.all || statusFilter.cancelled;

  // Mezanino usage has no cancellation, only returned vs. still checked out —
  // the report reuses the same "finished"/"cancelled" checkboxes to mean that.
  const statusCondition: Prisma.MezaninoEntryWhereInput =
    includeReturned && includePending
      ? {}
      : includeReturned
        ? { exitAt: { not: null } }
        : includePending
          ? { exitAt: null }
          : { id: "" };

  return {
    room,
    ...statusCondition,
    ...(range.startDate || range.endDate
      ? {
          entryAt: {
            ...(range.startDate ? { gte: range.startDate } : {}),
            ...(range.endDate ? { lte: range.endDate } : {}),
          },
        }
      : {}),
    ...(q ? { unit: { contains: q } } : {}),
  };
}

export interface ReportRow {
  id: string;
  room: string;
  unit: string;
  requesterName: string;
  eventAt: Date;
  finishedAt: Date | null;
  finishedByUsername: string | null;
  cancelledAt: Date | null;
  cancelledByUsername: string | null;
}

// Normalizes a mezanino entry/exit record into the same row shape the scheduling
// report already uses, so the list/PDF rendering code stays a single path.
export function mezaninoEntryToReportRow(entry: {
  id: string;
  room: string;
  unit: string;
  residentName: string;
  entryAt: Date;
  exitAt: Date | null;
  exitConfirmedByUsername: string | null;
}): ReportRow {
  return {
    id: entry.id,
    room: entry.room,
    unit: entry.unit,
    requesterName: entry.residentName,
    eventAt: entry.entryAt,
    finishedAt: entry.exitAt,
    finishedByUsername: entry.exitConfirmedByUsername,
    cancelledAt: null,
    cancelledByUsername: null,
  };
}
