"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schedulingApi } from "../api";
import type { SchedulingEntryInput, SchedulingEntryUpdateInput, SchedulingListParams } from "../types";

const queryKey = ["scheduling"];

export function useSchedulingEntries(params: SchedulingListParams) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => schedulingApi.list(params),
  });
}

export function useCreateSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SchedulingEntryInput) => schedulingApi.createEntry(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SchedulingEntryUpdateInput }) => schedulingApi.updateEntry(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useFinishSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingApi.finish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteSchedulingEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulingApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
