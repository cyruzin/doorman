import type { Prisma } from "@/generated/prisma/client";
import type { SchedulingRoom } from "@/generated/prisma/enums";

// Every schedulable room gets a control report — the building needs a paper
// trail of what was used vs. cancelled for billing/reconciliation.
export const REPORT_ROOMS = ["PARTY_HALL", "CINEMA", "GRILL"] as const;
export type ReportRoom = (typeof REPORT_ROOMS)[number];

export const REPORT_ROOM_LABELS: Record<ReportRoom, string> = {
  PARTY_HALL: "Salão de festas",
  CINEMA: "Cinema",
  GRILL: "Grill",
};

// Three independent checkboxes, not a single choice — the doorman can check
// none, one, several, or all three at once.
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
  // A booking's eventAt can itself be in the future (that's the point of
  // scheduling ahead) and can be cancelled at any time, so the report needs
  // to be able to cover future-dated, already-cancelled events too.
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

  // Nothing checked means nothing matches — a real filter (a where clause
  // that can never be true), not "no filter applied".
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
