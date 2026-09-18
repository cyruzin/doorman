import type { SchedulingEntry, SchedulingRoom } from "@/modules/scheduling/types";
import type { MezaninoRoom } from "@/modules/mezanino/types";

export type ReportRoom = Extract<SchedulingRoom, "PARTY_HALL" | "CINEMA" | "GRILL"> | MezaninoRoom;
// The mezanino API normalizes entry/exit rows into this same shape server-side.
export type ReportEntry = SchedulingEntry;

// Every schedulable room and mezanino space gets a control report.
export const REPORT_ROOMS: ReportRoom[] = ["PARTY_HALL", "CINEMA", "GRILL", "GAME_ROOM", "GYM", "KIDS_SPACE"];

export const ROOM_LABELS: Record<ReportRoom, string> = {
  PARTY_HALL: "Salão de festas",
  CINEMA: "Cinema",
  GRILL: "Grill",
  GAME_ROOM: "Salão de jogos",
  GYM: "Academia",
  KIDS_SPACE: "Espaço kids",
};

export const MEZANINO_REPORT_ROOMS: MezaninoRoom[] = ["GAME_ROOM", "GYM", "KIDS_SPACE"];

export function isMezaninoReportRoom(room: ReportRoom): room is MezaninoRoom {
  return (MEZANINO_REPORT_ROOMS as string[]).includes(room);
}

// Independent checkboxes — none, one, several, or all three at once.
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
