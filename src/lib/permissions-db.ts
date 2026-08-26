import { prisma } from "./prisma";
import type { Action, PermissionsMatrix, Resource } from "./permissions";
import type { Role } from "@/generated/prisma/enums";

export async function can(role: Role, resource: Resource, action: Action): Promise<boolean> {
  const row = await prisma.rolePermission.findUnique({
    where: { role_resource_action: { role, resource, action } },
  });
  return !!row;
}

export async function getPermissionsMatrix(): Promise<PermissionsMatrix> {
  const rows = await prisma.rolePermission.findMany();
  const matrix: PermissionsMatrix = { ADMIN: {}, DOORMAN: {} };
  for (const row of rows) {
    const bucket = matrix[row.role][row.resource as Resource] ?? [];
    bucket.push(row.action as Action);
    matrix[row.role][row.resource as Resource] = bucket;
  }
  return matrix;
}

export async function setPermissionsMatrix(matrix: PermissionsMatrix): Promise<void> {
  const rows: { role: Role; resource: string; action: string }[] = [];
  for (const role of ["ADMIN", "DOORMAN"] as const) {
    for (const [resource, actions] of Object.entries(matrix[role] ?? {})) {
      for (const action of actions ?? []) {
        rows.push({ role, resource, action });
      }
    }
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.rolePermission.createMany({ data: rows }),
  ]);
}
