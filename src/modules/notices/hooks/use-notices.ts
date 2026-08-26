"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardSummaryQueryKey } from "@/modules/home/hooks/use-dashboard-summary";
import { noticesApi } from "../api";
import type { NoticeInput, NoticeListParams } from "../types";

const queryKey = ["notices"];

export function useNotices(params: NoticeListParams = {}) {
  return useQuery({ queryKey: [...queryKey, params], queryFn: () => noticesApi.list(params) });
}

// A pinned notice also shows on the dashboard, cached under its own query key.
export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NoticeInput) => noticesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey });
    },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey });
    },
  });
}
