import { api } from "@/lib/axios";
import type { ReportListParams, ReportListResult } from "./types";

export const reportsApi = {
  list: async (params: ReportListParams): Promise<ReportListResult> =>
    (await api.get("/reports", { params })).data,
  downloadPdf: async (params: Omit<ReportListParams, "page" | "pageSize">): Promise<Blob> =>
    (await api.get("/reports/pdf", { params, responseType: "blob" })).data,
};
