import { createPersonCollectionHandlers } from "@/lib/person-crud";

export const { GET, POST } = createPersonCollectionHandlers("tenant", "tenants");
