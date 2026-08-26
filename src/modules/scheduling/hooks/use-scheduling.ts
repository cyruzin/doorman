"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardSummaryQueryKey } from "@/modules/home/hooks/use-dashboard-summary";
import { reportsQueryKey } from "@/modules/reports/hooks/use-reports";
import { schedulingApi } from "../api";
import type { SchedulingEntryInput, SchedulingEntryUpdateInput, SchedulingListParams } from "../types";

const queryKey = ["scheduling"];

export function useSchedulingEntries(params: SchedulingListParams) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => schedulingApi.list(params),
  });
}

// A scheduling entry also feeds the dashboard's capacity/upcoming widgets and the
// reports list — both read the same underlying entries, cached under their own keys.
function invalidateSchedulingEffects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey });
  queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey });
  queryClient.invalidateQueries({ queryKey: reportsQueryKey });
}

export function useCreateSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SchedulingEntryInput) => schedulingApi.createEntry(data),
    onSuccess: () => invalidateSchedulingEffects(queryClient),
  });
}

export function useUpdateSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SchedulingEntryUpdateInput }) => schedulingApi.updateEntry(id, data),
    onSuccess: () => invalidateSchedulingEffects(queryClient),
  });
}

export function useFinishSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingApi.finish(id),
    onSuccess: () => invalidateSchedulingEffects(queryClient),
  });
}

export function useDeleteSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingApi.remove(id),
    onSuccess: () => invalidateSchedulingEffects(queryClient),
  });
}
