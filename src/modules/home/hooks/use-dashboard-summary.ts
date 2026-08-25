"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api";

export const dashboardSummaryQueryKey = ["dashboard-summary"];

export function useDashboardSummary() {
  return useQuery({ queryKey: dashboardSummaryQueryKey, queryFn: dashboardApi.getSummary });
}
