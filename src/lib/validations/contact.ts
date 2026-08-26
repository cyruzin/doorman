import { z } from "zod";

// Shared by Owner and Resident — both let a person list more than one phone/vehicle.
export const phoneSchema = z.object({
  number: z.string().min(1, "Telefone é obrigatório"),
  isWhatsapp: z.boolean(),
});

export const vehicleSchema = z.object({
  plate: z.string().optional(),
  model: z.string().optional(),
});
