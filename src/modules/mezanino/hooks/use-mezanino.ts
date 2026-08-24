"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mezaninoApi } from "../api";
import type { MezaninoEntryInput, MezaninoListParams } from "../types";

const queryKey = ["mezanino"];

export function useMezaninoEntries(params: MezaninoListParams) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => mezaninoApi.list(params),
  });
}

export function useCreateMezaninoEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MezaninoEntryInput) => mezaninoApi.createEntry(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useConfirmMezaninoExit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mezaninoApi.confirmExit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteMezaninoEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mezaninoApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
