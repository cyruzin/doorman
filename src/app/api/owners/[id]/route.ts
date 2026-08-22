import { createPersonItemHandlers } from "@/lib/person-crud";

export const { GET, PATCH, DELETE } = createPersonItemHandlers("owner", "owners");
