import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { userCreateSchema } from "@/lib/validations/user";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";

const SALT_ROUNDS = 10;
const userSelect = { id: true, username: true, role: true, isSuperAdmin: true, createdAt: true } as const;

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("users", "read");
  if (error) return error;

  const { q, page, pageSize, skip } = parsePagination(req);
  const where = q ? { username: { contains: q } } : undefined;

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, orderBy: { username: "asc" }, skip, take: pageSize }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize } satisfies PaginatedResult<(typeof items)[number]>);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("users", "create");
  if (error) return error;

  const parsed = userCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { username, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, passwordHash, role },
    select: userSelect,
  });

  return NextResponse.json(user, { status: 201 });
}
