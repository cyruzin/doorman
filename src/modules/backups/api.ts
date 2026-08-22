import { api } from "@/lib/axios";
import type { Backup, BackupFilter } from "./types";

export const backupsApi = {
  list: async (filter?: BackupFilter): Promise<Backup[]> => (await api.get("/backups", { params: filter })).data,
  create: async (): Promise<Backup> => (await api.post("/backups")).data,
  remove: async (fileName: string): Promise<void> => {
    await api.delete(`/backups/${encodeURIComponent(fileName)}`);
  },
};
