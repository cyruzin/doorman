import type { Role } from "@/generated/prisma/enums";

export type Resource = "residents" | "owners" | "users" | "backups" | "mezanino" | "scheduling" | "reports" | "notices";
export type Action = "create" | "read" | "update" | "delete";

const permissions: Record<Role, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    residents: ["create", "read", "update", "delete"],
    owners: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    backups: ["create", "read", "delete"],
    mezanino: ["create", "read", "update", "delete"],
    scheduling: ["create", "read", "update", "delete"],
    reports: ["read"],
    // Handover notes are shared between porteiros — either role can post one.
    // The route layer narrows "delete" further: automatic notes are never
    // deletable, and a doorman may only delete their own manual ones.
    notices: ["create", "read", "delete"],
  },
  DOORMAN: {
    residents: ["create", "read", "update"],
    owners: ["create", "read", "update"],
    // Key checkout is a front-desk task — doormen run it end to end.
    mezanino: ["create", "read", "update", "delete"],
    // Same front-desk ownership for event scheduling.
    scheduling: ["create", "read", "update", "delete"],
    // Doormen need to pull the paid-room control reports themselves.
    reports: ["read"],
    notices: ["create", "read", "delete"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return permissions[role]?.[resource]?.includes(action) ?? false;
}
