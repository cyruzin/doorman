"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { permissionsApi } from "../api";
import type { Action, PermissionsMatrix, Resource } from "@/lib/permissions";

const queryKey = ["permissions-matrix"];

export function usePermissionsMatrix() {
  const { status } = useSession();
  return useQuery({
    queryKey,
    queryFn: permissionsApi.get,
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePermissionsMatrix() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matrix: PermissionsMatrix) => permissionsApi.update(matrix),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
}

// Drop-in replacement for the old sync `can(role, resource, action)` — reads
// the current user's role from the session and looks it up in the fetched matrix.
export function usePermissions() {
  const { data: session } = useSession();
  const { data: matrix } = usePermissionsMatrix();
  const role = session?.user?.role;

  return {
    can: (resource: Resource, action: Action) => !!role && !!matrix?.[role]?.[resource]?.includes(action),
  };
}
