import { z } from "zod";

export const mezaninoEntrySchema = z.object({
  room: z.enum(["GAME_ROOM", "GYM", "KIDS_SPACE"]),
  unit: z.string().min(1, "Selecione um apartamento"),
  residentId: z.string().min(1, "Selecione o morador"),
});

export type MezaninoEntryCreateInput = z.infer<typeof mezaninoEntrySchema>;
