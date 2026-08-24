import type { MezaninoRoom } from "@/generated/prisma/enums";

export type { MezaninoRoom };

export const MEZANINO_ROOMS: MezaninoRoom[] = ["GAME_ROOM", "GYM", "KIDS_SPACE"];

export const ROOM_LABELS: Record<MezaninoRoom, string> = {
  GAME_ROOM: "Salão de jogos",
  GYM: "Academia",
  KIDS_SPACE: "Espaço kids",
};

export interface MezaninoEntry {
  id: string;
  room: MezaninoRoom;
  unit: string;
  residentName: string;
  entryAt: string;
  exitAt: string | null;
}

export interface MezaninoEntryInput {
  room: MezaninoRoom;
  unit: string;
}

export interface MezaninoListParams {
  room: MezaninoRoom;
  page?: number;
  pageSize?: number;
}

export interface MezaninoListResult {
  items: MezaninoEntry[];
  total: number;
  page: number;
  pageSize: number;
  occupied: boolean;
}
