import type { SchedulingRoom } from "@/generated/prisma/enums";

export type { SchedulingRoom };

export const SCHEDULING_ROOMS: SchedulingRoom[] = ["PARTY_HALL", "CINEMA", "GRILL"];

export const ROOM_LABELS: Record<SchedulingRoom, string> = {
  PARTY_HALL: "Salão de festas",
  CINEMA: "Cinema",
  GRILL: "Grill",
};

export interface SchedulingEntry {
  id: string;
  room: SchedulingRoom;
  unit: string;
  requesterName: string;
  eventAt: string;
  allowMultipleSameDay: boolean;
  notes: string | null;
  finishedAt: string | null;
  finishedByUsername: string | null;
  cancelledAt: string | null;
  cancelledByUsername: string | null;
}

export interface SchedulingEntryInput {
  room: SchedulingRoom;
  unit: string;
  residentId: string;
  eventAt: string;
  allowMultipleSameDay: boolean;
  notes?: string;
}

export interface SchedulingEntryUpdateInput {
  eventAt: string;
  allowMultipleSameDay: boolean;
  notes?: string;
}

export interface SchedulingListParams {
  room: SchedulingRoom;
  page?: number;
  pageSize?: number;
}

export interface SchedulingListResult {
  items: SchedulingEntry[];
  total: number;
  page: number;
  pageSize: number;
  capacityPercent: number;
}
