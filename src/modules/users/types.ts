import { z } from "zod";
import type { Role } from "@/generated/prisma/enums";
import { usernameSchema } from "@/lib/validations/user";

export const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  username: usernameSchema,
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
  name: string;
  username: string;
  role: Role;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface UserInput {
  name: string;
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
