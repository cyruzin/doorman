import { api } from "@/lib/axios";
import type { Notice, NoticeInput, NoticeListParams, NoticeListResult } from "./types";

export const noticesApi = {
  list: async (params: NoticeListParams = {}): Promise<NoticeListResult> =>
    (await api.get("/notices", { params })).data,
  create: async (data: NoticeInput): Promise<Notice> => (await api.post("/notices", data)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/notices/${id}`);
  },
};
