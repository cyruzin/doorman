import { api } from "@/lib/axios";
import type { Resident, ResidentListParams, ResidentListResult, ResidentWriteInput } from "./types";

export const residentsApi = {
  list: async (params: ResidentListParams = {}): Promise<ResidentListResult> =>
    (await api.get("/residents", { params })).data,
  get: async (id: string): Promise<Resident> => (await api.get(`/residents/${id}`)).data,
  create: async (data: ResidentWriteInput): Promise<Resident> => (await api.post("/residents", data)).data,
  update: async (id: string, data: Partial<ResidentWriteInput>): Promise<Resident> =>
    (await api.patch(`/residents/${id}`, data)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/residents/${id}`);
  },
};
