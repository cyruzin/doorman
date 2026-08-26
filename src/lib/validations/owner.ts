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

export const ownerUpdateSchema = ownerSchema.partial();

export type OwnerInput = z.infer<typeof ownerSchema>;
