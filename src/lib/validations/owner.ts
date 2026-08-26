import { z } from "zod";
import { phoneSchema, vehicleSchema } from "./contact";

// cpf is the dedup identifier (item 1 of the spec) when present, but stays
// optional — the previous system allowed registering an owner without one.
// units: an owner can hold more than one apartment (item 1.1); each unit can
// belong to only one owner, enforced by the API (OwnerUnit.unit is unique).
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
