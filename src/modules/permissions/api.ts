import { api } from "@/lib/axios";
import type { PermissionsMatrix } from "@/lib/permissions";

export const permissionsApi = {
  get: async (): Promise<PermissionsMatrix> => (await api.get("/permissions")).data,
  update: async (matrix: PermissionsMatrix): Promise<PermissionsMatrix> => (await api.put("/permissions", matrix)).data,
};
