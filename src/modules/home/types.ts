import type { SchedulingEntry, SchedulingRoom } from "@/modules/scheduling/types";
import type { Notice } from "@/modules/notices/types";

export interface OccupancySummary {
  totalUnits: number;
  occupiedUnits: number;
  totalResidents: number;
}

export interface SchedulingSummary {
  capacityByRoom: Partial<Record<SchedulingRoom, number>>;
  upcoming: SchedulingEntry[];
}

export interface DashboardSummary {
  occupancy: OccupancySummary;
  scheduling: SchedulingSummary | null;
  notices: Notice[] | null;
}
