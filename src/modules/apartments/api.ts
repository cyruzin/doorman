import { api } from "@/lib/axios";
import type { UnitOccupancy } from "./types";

export const unitsApi = {
  getOccupancy: async (unit: string): Promise<UnitOccupancy> => (await api.get(`/units/${unit}`)).data,
  getOccupiedUnits: async (): Promise<string[]> => (await api.get("/units/occupied")).data.units,
};
