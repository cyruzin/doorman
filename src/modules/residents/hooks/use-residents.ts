"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardSummaryQueryKey } from "@/modules/home/hooks/use-dashboard-summary";
import { occupiedUnitsQueryKey } from "@/modules/apartments/hooks/use-occupied-units";
import { unitOccupancyQueryKey } from "@/modules/apartments/hooks/use-unit-occupancy";
import { residentsApi } from "../api";
import type { ResidentListParams, ResidentWriteInput } from "../types";

const queryKey = ["residents"];

export function useResidents(params: ResidentListParams & { enabled?: boolean } = {}) {
  const { enabled = true, ...listParams } = params;
  return useQuery({ queryKey: [...queryKey, listParams], queryFn: () => residentsApi.list(listParams), enabled });
}

// A resident also changes who a unit shows as occupied by — everywhere that's cached.
function invalidateResidentEffects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey });
  queryClient.invalidateQueries({ queryKey: unitOccupancyQueryKey });
  queryClient.invalidateQueries({ queryKey: occupiedUnitsQueryKey });
  queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey });
}

export function useCreateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ResidentWriteInput) => residentsApi.create(data),
    onSuccess: () => invalidateResidentEffects(queryClient),
  });
}

export function useUpdateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResidentWriteInput> }) => residentsApi.update(id, data),
    onSuccess: () => invalidateResidentEffects(queryClient),
  });
}

export function useDeleteResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => residentsApi.remove(id),
    onSuccess: () => invalidateResidentEffects(queryClient),
  });
}
