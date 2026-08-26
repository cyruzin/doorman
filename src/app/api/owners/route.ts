import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import { ownerSchema } from "@/lib/validations/owner";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import { contactNestedWrites } from "@/lib/contact-writes";
import { findClaimedUnits } from "@/lib/owner-units";
import { normalizeCpf } from "@/lib/normalize-cpf";

const ownerInclude = {
  phones: true,
  vehicles: true,
  units: { select: { unit: true } },
  residents: { select: { id: true, name: true, unit: true } },
} as const;

function toOwnerResponse(owner: { units: { unit: string }[] } & Record<string, unknown>) {
  return { ...owner, units: owner.units.map((u) => u.unit) };
}

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("owners", "read");
  if (error) return error;

  const { q, page, pageSize, skip } = parsePagination(req);
  const status = new URL(req.url).searchParams.get("status") ?? "active";

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q };
  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;

  const [items, total] = await Promise.all([
    prisma.owner.findMany({ where, include: ownerInclude, orderBy: { name: "asc" }, skip, take: pageSize }),
    prisma.owner.count({ where }),
  ]);

  return NextResponse.json({ items: items.map(toOwnerResponse), total, page, pageSize } satisfies PaginatedResult<unknown>);
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("owners", "create");
  if (error) return error;

  const parsed = ownerSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const claimed = await findClaimedUnits(parsed.data.units);
  if (claimed.length > 0) {
    return NextResponse.json({ error: `Apartamento(s) já possuem proprietário: ${claimed.join(", ")}` }, { status: 400 });
  }

  const { units, phones, vehicles, ...rest } = parsed.data;
  try {
    const created = await prisma.owner.create({
      data: {
        ...normalizeCpf(rest),
        units: { create: units.map((unit) => ({ unit })) },
        ...contactNestedWrites({ phones, vehicles }, false),
      },
      include: ownerInclude,
    });
    return NextResponse.json(toOwnerResponse(created), { status: 201 });
  } catch (err) {
    if (isUniqueCpfViolation(err)) {
      return NextResponse.json({ error: "Já existe um proprietário cadastrado com esse CPF" }, { status: 400 });
    }
    throw err;
  }
}

function isUniqueCpfViolation(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
}
