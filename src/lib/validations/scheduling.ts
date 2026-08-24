import { z } from "zod";

const futureEventAt = z.coerce
  .date()
  .refine((date) => date.getTime() > Date.now(), "A data e hora do evento devem ser no futuro");

export const schedulingEntrySchema = z.object({
  room: z.enum(["PARTY_HALL", "CINEMA", "GRILL"]),
  unit: z.string().min(1, "Selecione um apartamento"),
  eventAt: futureEventAt,
  allowMultipleSameDay: z.boolean(),
  notes: z.string().trim().min(1).optional(),
});

export const schedulingUpdateSchema = z.object({
  eventAt: futureEventAt,
  allowMultipleSameDay: z.boolean(),
  notes: z.string().trim().min(1).optional(),
});

export type SchedulingEntryCreateInput = z.infer<typeof schedulingEntrySchema>;
export type SchedulingEntryUpdateInput = z.infer<typeof schedulingUpdateSchema>;
