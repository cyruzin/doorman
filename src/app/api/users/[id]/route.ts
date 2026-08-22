import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { userUpdateSchema } from "@/lib/validations/user";

const SALT_ROUNDS = 10;
const userSelect = { id: true, username: true, role: true, isSuperAdmin: true, createdAt: true } as const;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("users", "read");
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("users", "update");
  if (error) return error;

  const parsed = userUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { isSuperAdmin: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.isSuperAdmin && parsed.data.role && parsed.data.role !== "ADMIN") {
    return NextResponse.json({ error: "O super admin não pode perder o papel de administrador" }, { status: 403 });
  }

  const { password, ...rest } = parsed.data;
  const data = password
    ? { ...rest, passwordHash: await bcrypt.hash(password, SALT_ROUNDS) }
    : rest;

  const updated = await prisma.user.update({ where: { id }, data, select: userSelect });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { error } = await requirePermission("users", "delete");
  if (error) return error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { isSuperAdmin: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.isSuperAdmin) {
    return NextResponse.json({ error: "O super admin não pode ser excluído" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
