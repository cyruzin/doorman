"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardSummaryQueryKey } from "@/modules/home/hooks/use-dashboard-summary";
import { noticesApi } from "../api";
import type { NoticeInput, NoticeListParams } from "../types";

const queryKey = ["notices"];

export function useNotices(params: NoticeListParams = {}) {
  return useQuery({ queryKey: [...queryKey, params], queryFn: () => noticesApi.list(params) });
}

// A notice with "Exibir no início" pinned appears on the home dashboard too —
// its own query is cached separately, so a create/delete here has to
// invalidate it as well or the dashboard shows stale data until reload.
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
