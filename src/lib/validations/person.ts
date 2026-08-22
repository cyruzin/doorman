import { z } from "zod";

export const phoneSchema = z.object({
  number: z.string().min(1, "Telefone é obrigatório"),
  isWhatsapp: z.boolean(),
});

export const vehicleSchema = z.object({
  plate: z.string().optional(),
  model: z.string().optional(),
});

// Shared shape for Tenant and Owner — both are the same "person on a unit" record.
export const personSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  phones: z.array(phoneSchema),
  vehicles: z.array(vehicleSchema),
});

export const personUpdateSchema = personSchema.partial();

export type PersonInput = z.infer<typeof personSchema>;

// Tenants can optionally link to the Owner they're renting from (locador).
// The select's empty option submits "" — normalized to null in person-owner-link.ts
// (kept out of the schema so input/output types match, which is what
// react-hook-form's zodResolver requires).
export const tenantSchema = personSchema.extend({
  ownerId: z.string().optional(),
});

export const tenantUpdateSchema = tenantSchema.partial();

export type TenantInput = z.infer<typeof tenantSchema>;
