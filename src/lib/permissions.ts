export type Resource = "residents" | "owners" | "users" | "backups" | "mezanino" | "scheduling" | "reports" | "notices";
export type Action = "create" | "read" | "update" | "delete";

export const RESOURCES: Resource[] = ["residents", "owners", "users", "backups", "mezanino", "scheduling", "reports", "notices"];
export const ACTIONS: Action[] = ["create", "read", "update", "delete"];

export type PermissionsMatrix = Record<"ADMIN" | "DOORMAN", Partial<Record<Resource, Action[]>>>;
