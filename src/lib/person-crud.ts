import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-guard";
import {
  personSchema,
  personUpdateSchema,
  tenantSchema,
  tenantUpdateSchema,
} from "@/lib/validations/person";
import { can, type Resource } from "@/lib/permissions";
import { parsePagination, type PaginatedResult } from "@/lib/pagination";
import { normalizeOwnerId } from "@/lib/person-owner-link";

// Tenant and Owner share the exact same shape and CRUD rules — this factory
// backs both /api/tenants and /api/owners instead of duplicating the routes.
// Tenant additionally links to the Owner it rents from (locador/locatário).
type Model = "tenant" | "owner";

const relationSummarySelect = { id: true, name: true, unit: true } as const;

// Tenant includes its linked owner; Owner includes its current tenants — this
// is what lets both screens show who's renting to/from whom. Both include
// their phones/vehicles since a resident can have more than one of each.
const includeByModel: Record<Model, Record<string, unknown>> = {
  tenant: { owner: { select: relationSummarySelect }, phones: true, vehicles: true },
  owner: { tenants: { select: relationSummarySelect }, phones: true, vehicles: true },
};

const schemaByModel = {
  tenant: { create: tenantSchema, update: tenantUpdateSchema },
  owner: { create: personSchema, update: personUpdateSchema },
};

interface PersonDelegate {
  findMany(args?: unknown): Promise<unknown[]>;
  count(args?: unknown): Promise<number>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

function delegate(model: Model): PersonDelegate {
  return (model === "tenant" ? prisma.tenant : prisma.owner) as unknown as PersonDelegate;
}

// phones/vehicles arrive as plain arrays from the form; Prisma needs them as
// nested writes. On update, `deleteMany: {}` + `create` fully replaces the set —
// simpler than diffing add/edit/remove for what's a handful of rows per person.
function toNestedWrites(data: Record<string, unknown>, isUpdate: boolean): Record<string, unknown> {
  const { phones, vehicles, ...rest } = data;
  const result: Record<string, unknown> = { ...rest };
  if (phones !== undefined) {
    result.phones = isUpdate ? { deleteMany: {}, create: phones } : { create: phones };
  }
  if (vehicles !== undefined) {
    result.vehicles = isUpdate ? { deleteMany: {}, create: vehicles } : { create: vehicles };
  }
  return result;
}

function prepareWrite(model: Model, data: Record<string, unknown>, isUpdate: boolean): Record<string, unknown> {
  return toNestedWrites(normalizeOwnerId(model, data), isUpdate);
}

// A tenant always rents from an owner — reject the write if nobody is
// registered as the owner of that unit, regardless of which owner (if any)
// was picked as the locador.
async function unitHasNoOwner(unit: string): Promise<boolean> {
  const owner = await prisma.owner.findFirst({ where: { unit, active: true }, select: { id: true } });
  return !owner;
}

type RouteParams = { params: Promise<{ id: string }> };

export function createPersonCollectionHandlers(model: Model, resource: Resource) {
  async function GET(req: NextRequest) {
    const { error } = await requirePermission(resource, "read");
    if (error) return error;

    const { q, page, pageSize, skip } = parsePagination(req);
    const status = new URL(req.url).searchParams.get("status") ?? "active";

    const where: Record<string, unknown> = {};
    if (q) where.name = { contains: q };
    if (status === "active") where.active = true;
    if (status === "inactive") where.active = false;

    const [items, total] = await Promise.all([
      delegate(model).findMany({
        where,
        include: includeByModel[model],
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      delegate(model).count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize } satisfies PaginatedResult<unknown>);
  }

  async function POST(req: NextRequest) {
    const { error } = await requirePermission(resource, "create");
    if (error) return error;

    const parsed = schemaByModel[model].create.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (model === "tenant" && (await unitHasNoOwner((parsed.data as { unit: string }).unit))) {
      return NextResponse.json({ error: "Apartamento sem proprietário cadastrado" }, { status: 400 });
    }

    const data = prepareWrite(model, parsed.data, false);
    const created = await delegate(model).create({ data, include: includeByModel[model] });
    return NextResponse.json(created, { status: 201 });
  }

  return { GET, POST };
}

export function createPersonItemHandlers(model: Model, resource: Resource) {
  async function GET(_req: NextRequest, { params }: RouteParams) {
    const { error } = await requirePermission(resource, "read");
    if (error) return error;

    const { id } = await params;
    const item = await delegate(model).findUnique({ where: { id }, include: includeByModel[model] });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  }

  async function PATCH(req: NextRequest, { params }: RouteParams) {
    const { error, session } = await requirePermission(resource, "update");
    if (error) return error;

    const parsed = schemaByModel[model].update.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (model === "tenant" && parsed.data.unit !== undefined && (await unitHasNoOwner(parsed.data.unit))) {
      return NextResponse.json({ error: "Apartamento sem proprietário cadastrado" }, { status: 400 });
    }

    // Activating/deactivating is the soft-delete equivalent — same permission as delete.
    if (parsed.data.active !== undefined && !can(session.user.role, resource, "delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const updated = await delegate(model).update({
      where: { id },
      data: prepareWrite(model, parsed.data, true),
      include: includeByModel[model],
    });
    return NextResponse.json(updated);
  }

  async function DELETE(_req: NextRequest, { params }: RouteParams) {
    const { error } = await requirePermission(resource, "delete");
    if (error) return error;

    const { id } = await params;
    await delegate(model).delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  return { GET, PATCH, DELETE };
}
