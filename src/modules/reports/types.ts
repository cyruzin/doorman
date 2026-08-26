import type { SchedulingEntry, SchedulingRoom } from "@/modules/scheduling/types";

export type ReportRoom = Extract<SchedulingRoom, "PARTY_HALL" | "CINEMA" | "GRILL">;
export type ReportEntry = SchedulingEntry;

// Every schedulable room gets a control report.
export const REPORT_ROOMS: ReportRoom[] = ["PARTY_HALL", "CINEMA", "GRILL"];

export const ROOM_LABELS: Record<ReportRoom, string> = {
  PARTY_HALL: "Salão de festas",
  CINEMA: "Cinema",
  GRILL: "Grill",
};

// Three independent checkboxes — the doorman can check none, one, several,
// or all three at the same time.
export interface ReportStatusFilter {
  all: boolean;
  finished: boolean;
  cancelled: boolean;
}

export interface ReportListParams extends ReportStatusFilter {
  room: ReportRoom;
  startDate?: string;
  endDate?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportListResult {
  items: ReportEntry[];
  total: number;
  page: number;
  pageSize: number;
}
