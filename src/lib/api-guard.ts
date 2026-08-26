import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Action, Resource } from "@/lib/permissions";
import { can } from "@/lib/permissions-db";

export async function requirePermission(resource: Resource, action: Action) {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  if (!(await can(session.user.role, resource, action))) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { session, error: null } as const;
}
