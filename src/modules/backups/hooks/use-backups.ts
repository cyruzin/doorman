"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backupsApi } from "../api";
import type { BackupFilter } from "../types";

const baseKey = "backups";

export function useBackups(filter: BackupFilter, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [baseKey, filter],
    queryFn: () => backupsApi.list(filter),
    enabled: options.enabled ?? true,
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backupsApi.create(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [baseKey] }),
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileName: string) => backupsApi.remove(fileName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [baseKey] }),
  });
}
