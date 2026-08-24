import { z } from "zod";

export const mezaninoEntrySchema = z.object({
  room: z.enum(["GAME_ROOM", "GYM", "KIDS_SPACE"]),
  unit: z.string().min(1, "Selecione um apartamento"),
});

export type MezaninoEntryCreateInput = z.infer<typeof mezaninoEntrySchema>;
