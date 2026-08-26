import { z } from "zod";
import { phoneSchema, vehicleSchema } from "./contact";

// name/cpf/email stay required in the shape even when isOwner is true — the
// form auto-fills them from the picked owner, and the API re-derives them
// from the Owner record on write regardless of what's submitted (single
// source of truth, avoids the two records drifting apart).
const residentBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  isOwner: z.boolean(),
  ownerId: z.string().optional(),
  phones: z.array(phoneSchema),
  vehicles: z.array(vehicleSchema),
});

function requiresOwnerId(data: { isOwner: boolean; ownerId?: string }): boolean {
  return !data.isOwner || !!data.ownerId;
}

export const residentSchema = residentBaseSchema.refine(requiresOwnerId, {
  message: "Selecione o proprietário",
  path: ["ownerId"],
});

export const residentUpdateSchema = residentBaseSchema.partial().refine(
  (data) => data.isOwner === undefined || requiresOwnerId({ isOwner: data.isOwner, ownerId: data.ownerId }),
  { message: "Selecione o proprietário", path: ["ownerId"] },
);

export type ResidentInput = z.infer<typeof residentBaseSchema>;
