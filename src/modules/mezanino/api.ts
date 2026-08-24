import { api } from "@/lib/axios";
import type { MezaninoEntry, MezaninoEntryInput, MezaninoListParams, MezaninoListResult } from "./types";

export const mezaninoApi = {
  list: async (params: MezaninoListParams): Promise<MezaninoListResult> =>
    (await api.get("/mezanino", { params })).data,
  createEntry: async (data: MezaninoEntryInput): Promise<MezaninoEntry> => (await api.post("/mezanino", data)).data,
  confirmExit: async (id: string): Promise<MezaninoEntry> => (await api.patch(`/mezanino/${id}`)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/mezanino/${id}`);
  },
};
