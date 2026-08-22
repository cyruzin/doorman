import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can, type Action, type Resource } from "@/lib/permissions";

export async function requirePermission(resource: Resource, action: Action) {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  if (!can(session.user.role, resource, action)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { session, error: null } as const;
}
