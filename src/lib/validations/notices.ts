import { z } from "zod";

export const noticeSchema = z.object({
  message: z.string().trim().min(1, "Escreva uma mensagem").max(2000, "Mensagem muito longa"),
  showOnHome: z.boolean().optional().default(false),
});

export type NoticeCreateInput = z.infer<typeof noticeSchema>;
