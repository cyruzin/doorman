import { api } from "@/lib/axios";
import type { Owner, OwnerInput, OwnerListParams, OwnerListResult } from "./types";

export const ownersApi = {
  list: async (params: OwnerListParams = {}): Promise<OwnerListResult> => (await api.get("/owners", { params })).data,
  get: async (id: string): Promise<Owner> => (await api.get(`/owners/${id}`)).data,
  claimedUnits: async (excludeOwnerId?: string): Promise<Record<string, string>> =>
    (await api.get("/owners/claimed-units", { params: excludeOwnerId ? { excludeOwnerId } : undefined })).data.claims,
  create: async (data: OwnerInput): Promise<Owner> => (await api.post("/owners", data)).data,
  update: async (id: string, data: Partial<OwnerInput>): Promise<Owner> => (await api.patch(`/owners/${id}`, data)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/owners/${id}`);
  },
};
