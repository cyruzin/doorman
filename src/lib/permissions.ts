import type { Role } from "@/generated/prisma/enums";

export type Resource = "tenants" | "owners" | "users" | "backups";
export type Action = "create" | "read" | "update" | "delete";

const permissions: Record<Role, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    tenants: ["create", "read", "update", "delete"],
    owners: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    backups: ["create", "read", "delete"],
  },
  DOORMAN: {
    tenants: ["create", "read", "update"],
    owners: ["create", "read", "update"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return permissions[role]?.[resource]?.includes(action) ?? false;
}
