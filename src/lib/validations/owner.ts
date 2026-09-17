import { z } from "zod";
import { phoneSchema, vehicleSchema } from "./contact";

// cpf optional (legacy owners had none); each unit belongs to one owner, enforced by the API.
export const ownerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  active: z.boolean(),
  units: z.array(z.string().min(1)).min(1, "Selecione ao menos um apartamento"),
  phones: z.array(phoneSchema),
  vehicles: z.array(vehicleSchema),
});

// `password` is the re-authentication of the logged-in user, required only when the update
// deactivates the owner — it's not part of the owner's own data, hence the extend.
export const ownerUpdateSchema = ownerSchema.partial().extend({ password: z.string().optional() });

export const unlinkUnitsSchema = z.object({
  units: z.array(z.string().min(1)).min(1, "Selecione ao menos um apartamento"),
  password: z.string().min(1, "Confirme sua senha"),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
