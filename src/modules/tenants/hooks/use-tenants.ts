"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantsApi } from "../api";
import type { TenantInput } from "../types";
import type { PersonListParams } from "@/lib/person-client";

const queryKey = ["tenants"];

export function useTenants(params: PersonListParams = {}) {
  return useQuery({ queryKey: [...queryKey, params], queryFn: () => tenantsApi.list(params) });
}

export function useTenantDetail(id: string | null) {
  return useQuery({
    queryKey: [...queryKey, "detail", id],
    queryFn: () => tenantsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantInput) => tenantsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TenantInput> }) => tenantsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
