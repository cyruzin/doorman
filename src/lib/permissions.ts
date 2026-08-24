import type { Role } from "@/generated/prisma/enums";

export type Resource = "tenants" | "owners" | "users" | "backups" | "mezanino" | "scheduling" | "reports";
export type Action = "create" | "read" | "update" | "delete";

const permissions: Record<Role, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    tenants: ["create", "read", "update", "delete"],
    owners: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    backups: ["create", "read", "delete"],
    mezanino: ["create", "read", "update", "delete"],
    scheduling: ["create", "read", "update", "delete"],
    reports: ["read"],
  },
  DOORMAN: {
    tenants: ["create", "read", "update"],
    owners: ["create", "read", "update"],
    // Key checkout is a front-desk task — doormen run it end to end.
    mezanino: ["create", "read", "update", "delete"],
    // Same front-desk ownership for event scheduling.
    scheduling: ["create", "read", "update", "delete"],
    // Doormen need to pull the paid-room control reports themselves.
    reports: ["read"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return permissions[role]?.[resource]?.includes(action) ?? false;
}
