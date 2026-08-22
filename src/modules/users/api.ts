import { api } from "@/lib/axios";
import type { AppUser, UserInput, UserListParams, UserListResult, UserUpdateInput } from "./types";

export const usersApi = {
  list: async (params: UserListParams = {}): Promise<UserListResult> => (await api.get("/users", { params })).data,
  create: async (data: UserInput): Promise<AppUser> => (await api.post("/users", data)).data,
  update: async (id: string, data: UserUpdateInput): Promise<AppUser> =>
    (await api.patch(`/users/${id}`, data)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
