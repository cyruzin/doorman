"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownersApi } from "../api";
import type { OwnerInput, OwnerListParams } from "../types";

const queryKey = ["owners"];

export function useOwners(params: OwnerListParams & { enabled?: boolean } = {}) {
  const { enabled = true, ...listParams } = params;
  return useQuery({ queryKey: [...queryKey, listParams], queryFn: () => ownersApi.list(listParams), enabled });
}

export function useOwnerDetail(id: string | null) {
  return useQuery({
    queryKey: [...queryKey, "detail", id],
    queryFn: () => ownersApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OwnerInput) => ownersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OwnerInput> }) => ownersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ownersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
