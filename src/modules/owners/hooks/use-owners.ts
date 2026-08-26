"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardSummaryQueryKey } from "@/modules/home/hooks/use-dashboard-summary";
import { occupiedUnitsQueryKey } from "@/modules/apartments/hooks/use-occupied-units";
import { unitOccupancyQueryKey } from "@/modules/apartments/hooks/use-unit-occupancy";
import { ownersApi } from "../api";
import type { OwnerInput, OwnerListParams } from "../types";

const queryKey = ["owners"];

export function useOwners(params: OwnerListParams & { enabled?: boolean } = {}) {
  const { enabled = true, ...listParams } = params;
  return useQuery({ queryKey: [...queryKey, listParams], queryFn: () => ownersApi.list(listParams), enabled });
}

export function useClaimedUnits(excludeOwnerId?: string) {
  return useQuery({
    queryKey: [...queryKey, "claimed-units", excludeOwnerId],
    queryFn: () => ownersApi.claimedUnits(excludeOwnerId),
  });
}

// An owner also changes who a unit shows as occupied by — everywhere that's cached.
// `queryKey` alone already covers claimed-units, nested under the same prefix.
function invalidateOwnerEffects(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey });
  queryClient.invalidateQueries({ queryKey: unitOccupancyQueryKey });
  queryClient.invalidateQueries({ queryKey: occupiedUnitsQueryKey });
  queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OwnerInput) => ownersApi.create(data),
    onSuccess: () => invalidateOwnerEffects(queryClient),
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OwnerInput> }) => ownersApi.update(id, data),
    onSuccess: () => invalidateOwnerEffects(queryClient),
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ownersApi.remove(id),
    onSuccess: () => invalidateOwnerEffects(queryClient),
  });
}
