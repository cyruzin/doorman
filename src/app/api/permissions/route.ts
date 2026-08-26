import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/api-guard";
import { getPermissionsMatrix, setPermissionsMatrix } from "@/lib/permissions-db";
import { permissionsMatrixSchema } from "@/lib/validations/permissions";

// Not gated by requirePermission: every role needs to read the matrix for nav/page guards.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getPermissionsMatrix());
}

export async function PUT(req: NextRequest) {
  const { error } = await requirePermission("users", "update");
  if (error) return error;

  const parsed = permissionsMatrixSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ADMIN must keep users read+update, or this screen becomes unreachable.
  const adminUsersGrants = parsed.data.ADMIN.users ?? [];
  if (!adminUsersGrants.includes("read") || !adminUsersGrants.includes("update")) {
    return NextResponse.json(
      { error: "O administrador precisa manter permissão de leitura e edição de usuários" },
      { status: 400 },
    );
  }

  await setPermissionsMatrix(parsed.data as Parameters<typeof setPermissionsMatrix>[0]);
  return NextResponse.json(await getPermissionsMatrix());
}
