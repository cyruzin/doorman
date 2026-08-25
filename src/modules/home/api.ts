import { api } from "@/lib/axios";
import type { DashboardSummary } from "./types";

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => (await api.get("/dashboard")).data,
};
