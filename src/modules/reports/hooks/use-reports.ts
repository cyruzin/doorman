"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api";
import type { ReportListParams } from "../types";

export const reportsQueryKey = ["reports"];

export function useReportEntries(params: ReportListParams) {
  return useQuery({
    queryKey: [...reportsQueryKey, params],
    queryFn: () => reportsApi.list(params),
  });
}

export function useGenerateReportPdf() {
  return useMutation({
    mutationFn: (params: Omit<ReportListParams, "page" | "pageSize">) => reportsApi.downloadPdf(params),
  });
}
