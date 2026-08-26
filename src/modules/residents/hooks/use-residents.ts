"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { residentsApi } from "../api";
import type { ResidentListParams, ResidentWriteInput } from "../types";

const queryKey = ["residents"];

export function useResidents(params: ResidentListParams & { enabled?: boolean } = {}) {
  const { enabled = true, ...listParams } = params;
  return useQuery({ queryKey: [...queryKey, listParams], queryFn: () => residentsApi.list(listParams), enabled });
}

export function useResidentDetail(id: string | null) {
  return useQuery({
    queryKey: [...queryKey, "detail", id],
    queryFn: () => residentsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ResidentWriteInput) => residentsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResidentWriteInput> }) => residentsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => residentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
