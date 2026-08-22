"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api";
import type { UserInput, UserListParams, UserUpdateInput } from "../types";

const queryKey = ["users"];

export function useUsers(params: UserListParams & { enabled?: boolean } = {}) {
  const { enabled = true, ...listParams } = params;
  return useQuery({
    queryKey: [...queryKey, listParams],
    queryFn: () => usersApi.list(listParams),
    enabled,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserInput) => usersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateInput }) => usersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}
