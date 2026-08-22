import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";

export const userFormSchema = z.object({
  username: z.string().min(3, "Usuário deve ter ao menos 3 caracteres"),
  password: z
    .string()
    .min(6, "Senha deve ter ao menos 6 caracteres")
    .optional()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "DOORMAN"]),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export interface AppUser {
  id: string;
  username: string;
  role: Role;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface UserInput {
  username: string;
  password: string;
  role: Role;
}

export type UserUpdateInput = Partial<UserInput>;

export interface UserListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface UserListResult {
  items: AppUser[];
  total: number;
  page: number;
  pageSize: number;
}
