import { z } from "zod";

// Lowercase-only so a username always logs in exactly as typed.
export const usernameSchema = z
  .string()
  .min(3, "Usuário deve ter ao menos 3 caracteres")
  .regex(/^[a-z0-9_-]+$/, "Usuário deve conter apenas letras minúsculas, números, hífen e underscore");

export const userCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  username: usernameSchema,
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["ADMIN", "DOORMAN"]),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: usernameSchema.optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "DOORMAN"]).optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
