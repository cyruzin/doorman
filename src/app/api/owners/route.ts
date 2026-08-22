import { createPersonCollectionHandlers } from "@/lib/person-crud";

export const { GET, POST } = createPersonCollectionHandlers("owner", "owners");
