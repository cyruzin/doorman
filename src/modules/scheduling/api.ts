import { api } from "@/lib/axios";
import type {
  SchedulingEntry,
  SchedulingEntryInput,
  SchedulingEntryUpdateInput,
  SchedulingListParams,
  SchedulingListResult,
} from "./types";

export const schedulingApi = {
  list: async (params: SchedulingListParams): Promise<SchedulingListResult> =>
    (await api.get("/scheduling", { params })).data,
  createEntry: async (data: SchedulingEntryInput): Promise<SchedulingEntry> =>
    (await api.post("/scheduling", data)).data,
  updateEntry: async (id: string, data: SchedulingEntryUpdateInput): Promise<SchedulingEntry> =>
    (await api.patch(`/scheduling/${id}`, data)).data,
  finish: async (id: string): Promise<SchedulingEntry> => (await api.patch(`/scheduling/${id}/finish`)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/scheduling/${id}`);
  },
};
