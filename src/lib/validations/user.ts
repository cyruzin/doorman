import { z } from "zod";

export const userCreateSchema = z.object({
  username: z.string().min(3, "Usuário deve ter ao menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["ADMIN", "DOORMAN"]),
});

export const userUpdateSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "DOORMAN"]).optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
