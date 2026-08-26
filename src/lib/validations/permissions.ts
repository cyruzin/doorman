import { z } from "zod";
import { ACTIONS, RESOURCES } from "@/lib/permissions";

const roleGrants = z.object(
  Object.fromEntries(RESOURCES.map((r) => [r, z.array(z.enum(ACTIONS)).optional()])),
);

export const permissionsMatrixSchema = z.object({
  ADMIN: roleGrants,
  DOORMAN: roleGrants,
});

export type PermissionsMatrixInput = z.infer<typeof permissionsMatrixSchema>;
